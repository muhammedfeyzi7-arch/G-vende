import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef, type LayerProps, type MapRef } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, StateMessage } from '@/components/ui';
import { relativeTimeTr } from '@/utils/time';
import { env } from '@/services/env';
import { colors } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { UserReport } from '@/types/report';
import type { LatLng } from '@/utils/geo';
import { assemblyToGeoJSON, quakesToGeoJSON, reportsToGeoJSON, ringsToGeoJSON } from './geojson';
import { ASSEMBLY_LAYERS, QUAKE_LAYERS, REPORT_LAYERS, RING_LAYERS } from './layers';
import type { MapStyleId } from '@/features/settings/settings';
import { FALLBACK_STYLE_URL, GUVENDE_DARK_STYLE, LIGHT_STYLE_URL, SATELLITE_STYLE } from './mapStyle';

export type MapLayers = { quakes: boolean; rings: boolean; reports: boolean; assembly: boolean; family: boolean };
export const DEFAULT_LAYERS: MapLayers = { quakes: true, rings: true, reports: true, assembly: true, family: true };

/** Aile üyesinin izinli son konumu (yalnızca çevrimiçi grupta ve paylaşım açıksa). */
export type FamilyPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  at: string;
  stale: boolean;
  status: 'safe' | 'help' | 'unknown';
};

export type MapSelection = { kind: 'quake'; id: string } | { kind: 'report'; id: string } | { kind: 'assembly'; id: string };

export interface QuakeMapHandle {
  flyTo: (p: LatLng, zoom?: number) => void;
  /** Haritanın görünen merkezi (konum seçimi için) */
  getCenter: () => Promise<LatLng | null>;
}

type Props = {
  events: EarthquakeEvent[];
  focus: EarthquakeEvent | null;
  reports: UserReport[];
  assemblyPoints: AssemblyPoint[];
  user: LatLng | null;
  /** GPS konumu mu (mavi nokta) yoksa elle seçilen il mi */
  userIsPrecise: boolean;
  layers: MapLayers;
  onSelect: (s: MapSelection) => void;
  /** Haritanın üst/alt kısmındaki kaplamalar için görünüm boşluğu */
  topInset?: number;
  bottomInset?: number;
  /** Açılış görünümü (verilmezse odak olay / kullanıcı / Türkiye) */
  initialCenter?: LatLng;
  initialZoom?: number;
  /** Kullanıcının Ayarlar'da seçtiği harita görünümü */
  mapStyle?: MapStyleId;
  /** false ise harita yalnızca gösterim amaçlıdır (kaydırma/yakınlaştırma kapalı) */
  interactive?: boolean;
  family?: FamilyPin[];
};

const TURKEY_CENTER: [number, number] = [35.2, 39.0];
/** Simgeli işaretçi sayısı sınırlı (view annotation performansı); geri kalanı daire katmanıyla çizilir. */
const MAX_ASSEMBLY_MARKERS = 12;
const HITBOX = { top: 14, right: 14, bottom: 14, left: 14 };

// Sırayla denenecek stiller: ortam değişkeni (varsa) → seçilen görünüm → GÜVENDE koyu → OpenFreeMap dark.
function styleChain(id: MapStyleId) {
  const preferred = id === 'satellite' ? [SATELLITE_STYLE] : id === 'light' ? [LIGHT_STYLE_URL] : [];
  return [...(process.env.EXPO_PUBLIC_MAP_STYLE_URL ? [env.mapStyleUrl] : []), ...preferred, GUVENDE_DARK_STYLE, FALLBACK_STYLE_URL];
}

const renderLayers = (defs: { id: string }[]) => defs.map((d) => <Layer key={d.id} {...(d as LayerProps)} />);

export const QuakeMap = forwardRef<QuakeMapHandle, Props>(function QuakeMap(
  {
    events,
    focus,
    reports,
    assemblyPoints,
    user,
    userIsPrecise,
    layers,
    onSelect,
    topInset = 0,
    bottomInset = 0,
    initialCenter: startAt,
    initialZoom,
    mapStyle = 'dark',
    interactive = true,
    family = [],
  },
  ref,
) {
  const camera = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const STYLES = useMemo(() => styleChain(mapStyle), [mapStyle]);
  // Görünüm değişince yedek zinciri baştan başlar.
  const [fallback, setFallback] = useState({ style: mapStyle, index: 0 });
  const styleIndex = fallback.style === mapStyle ? fallback.index : 0;
  const setStyleIndex = (f: (i: number) => number) =>
    setFallback((prev) => ({ style: mapStyle, index: f(prev.style === mapStyle ? prev.index : 0) }));
  const [attempt, setAttempt] = useState(0);
  const failed = styleIndex >= STYLES.length;

  useImperativeHandle(ref, () => ({
    flyTo: (p, zoom = 10) => camera.current?.flyTo({ center: [p.longitude, p.latitude], zoom, duration: 800 }),
    getCenter: async () => {
      const c = await mapRef.current?.getCenter();
      return c ? { longitude: c[0], latitude: c[1] } : null;
    },
  }));

  const quakeData = useMemo(() => quakesToGeoJSON(events, focus?.id ?? null), [events, focus]);
  const ringData = useMemo(() => ringsToGeoJSON(focus), [focus]);
  const reportData = useMemo(() => reportsToGeoJSON(reports), [reports]);
  const assemblyData = useMemo(() => assemblyToGeoJSON(assemblyPoints), [assemblyPoints]);

  const initialCenter: [number, number] = startAt
    ? [startAt.longitude, startAt.latitude]
    : focus
      ? [focus.primary.longitude, focus.primary.latitude]
      : user
        ? [user.longitude, user.latitude]
        : TURKEY_CENTER;

  if (failed) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.error]}>
        <StateMessage
          icon="map-outline"
          tone="error"
          title="Harita yüklenemedi"
          message="Harita sunucusuna ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin. Deprem listesi ve toplanma alanları harita olmadan da kullanılabilir."
          actionLabel="Tekrar dene"
          onAction={() => {
            setStyleIndex(() => 0);
            setAttempt((a) => a + 1);
          }}
        />
      </View>
    );
  }

  const handlePress = (e: { nativeEvent: { features: GeoJSON.Feature[] } }) => {
    const f = e.nativeEvent.features[0];
    const kind = f?.properties?.kind as MapSelection['kind'] | undefined;
    const id = f?.properties?.id as string | undefined;
    if (kind && id) onSelect({ kind, id } as MapSelection);
  };

  return (
    <Map
      ref={mapRef}
      key={`${attempt}-${mapStyle}-${styleIndex}`}
      style={StyleSheet.absoluteFill}
      mapStyle={STYLES[styleIndex]!}
      onDidFailLoadingMap={() => setStyleIndex((i) => i + 1)}
      logo={false}
      attribution
      attributionPosition={{ bottom: bottomInset + 4, left: 8 }}
      compass={false}
      touchPitch={false}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      touchRotate={interactive}
      contentInset={{ top: topInset, left: 0, right: 0, bottom: bottomInset }}
      accessibilityLabel="Deprem haritası"
    >
      <Camera ref={camera} initialViewState={{ center: initialCenter, zoom: initialZoom ?? (focus ? 6.3 : 5) }} minZoom={3} maxZoom={16} />

      {layers.rings ? (
        <GeoJSONSource id="rings" data={ringData}>
          {renderLayers(RING_LAYERS)}
        </GeoJSONSource>
      ) : null}

      {layers.reports ? (
        <GeoJSONSource id="reports" data={reportData} onPress={handlePress} hitbox={HITBOX}>
          {renderLayers(REPORT_LAYERS)}
        </GeoJSONSource>
      ) : null}

      {layers.assembly ? (
        <GeoJSONSource id="assembly" data={assemblyData} onPress={handlePress} hitbox={HITBOX}>
          {renderLayers(ASSEMBLY_LAYERS)}
        </GeoJSONSource>
      ) : null}

      {layers.quakes ? (
        <GeoJSONSource id="quakes" data={quakeData} onPress={handlePress} hitbox={HITBOX}>
          {renderLayers(QUAKE_LAYERS)}
        </GeoJSONSource>
      ) : null}

      {layers.assembly
        ? assemblyPoints.slice(0, MAX_ASSEMBLY_MARKERS).map((p) => (
            <Marker
              key={p.id}
              id={`ap-${p.id}`}
              lngLat={[p.longitude, p.latitude]}
              onPress={() => onSelect({ kind: 'assembly', id: p.id })}
            >
              <View
                style={[styles.assemblyMarker, p.isUserSaved && styles.myMarker]}
                accessibilityLabel={p.isUserSaved ? `Kaydettiğiniz toplanma alanı: ${p.name}` : `Toplanma alanı: ${p.name}`}
              >
                <Ionicons name={p.isUserSaved ? 'flag' : 'people'} size={18} color={colors.safe} />
              </View>
            </Marker>
          ))
        : null}

      {layers.family
        ? family.map((f) => (
            <Marker key={f.id} id={`fam-${f.id}`} lngLat={[f.longitude, f.latitude]}>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={[
                    styles.famPin,
                    { borderColor: f.status === 'safe' ? colors.safe : f.status === 'help' ? colors.danger : colors.info },
                    f.stale && { opacity: 0.6 },
                  ]}
                  accessibilityLabel={`${f.name} son konumu${f.stale ? ' (eski)' : ''}`}
                >
                  <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                    {f.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
                  </AppText>
                </View>
                <View style={styles.famLabel}>
                  <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ fontSize: 10 }}>
                    {f.name} · {relativeTimeTr(f.at)}
                  </AppText>
                </View>
              </View>
            </Marker>
          ))
        : null}

      {user ? (
        <Marker id="me" lngLat={[user.longitude, user.latitude]}>
          <View style={styles.userHalo} accessibilityLabel={userIsPrecise ? 'Konumunuz' : 'Seçtiğiniz il (yaklaşık)'}>
            <View style={styles.userRing}>
              <View style={[styles.userDot, !userIsPrecise && styles.userDotApprox]} />
            </View>
          </View>
        </Marker>
      ) : null}
    </Map>
  );
});

const styles = StyleSheet.create({
  error: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  assemblyMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6,42,32,0.92)',
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(20,217,154,0.65)',
  },
  famPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  famLabel: { backgroundColor: colors.overlay, borderRadius: 6, paddingHorizontal: 4, marginTop: 2, alignSelf: 'center' },
  myMarker: { borderWidth: 3, boxShadow: '0 0 18px rgba(20,217,154,0.9)' },
  userHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(22,131,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(22,131,255,0.9)',
    backgroundColor: 'rgba(22,131,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(22,131,255,0.7)',
  },
  userDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff' },
  userDotApprox: { backgroundColor: 'transparent', borderColor: colors.primary },
});
