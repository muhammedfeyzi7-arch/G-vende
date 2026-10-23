import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type GeoJSONSourceRef,
  type LayerProps,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, StateMessage } from '@/components/ui';
import { relativeTimeTr } from '@/utils/time';
import { env } from '@/services/env';
import { currentScheme, type Scheme, colors, themedStyles } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { UserReport } from '@/types/report';
import type { LatLng } from '@/utils/geo';
import { assemblyToGeoJSON, quakesToGeoJSON, reportsToGeoJSON, ringsToGeoJSON } from './geojson';
import { ASSEMBLY_CLUSTER, ASSEMBLY_LAYERS, QUAKE_LAYERS, REPORT_LAYERS, RING_LAYERS } from './layers';
import type { MapStyleId } from '@/features/settings/settings';
import { isLightMap, offlineOnlyStyle, paletteFor, styleFor } from './mapStyle';
import { visibleLabels } from './offline/base';
import { CATEGORY_META } from '@/features/reports/categories';

import type { FamilyPin, MapLayers, MapSelection, QuakeMapHandle, QuakeMapProps as Props } from './mapTypes';

const TURKEY_CENTER: [number, number] = [35.2, 39.0];
const MAX_REPORT_MARKERS = 30;
const HITBOX = { top: 14, right: 14, bottom: 14, left: 14 };

// Sırayla denenecek stiller: ortam değişkeni (varsa) → seçilen görünüm → tamamen çevrimdışı altlık.
// Son halka ağ kaynağı kullanmadığı için harita internet yokken de boş kalmaz.
function styleChain(id: MapStyleId, scheme: Scheme) {
  return [
    ...(process.env.EXPO_PUBLIC_MAP_STYLE_URL ? [env.mapStyleUrl] : []),
    styleFor(id, scheme),
    offlineOnlyStyle(paletteFor(id, scheme)),
  ];
}

const renderLayers = (defs: { id: string }[]) => defs.map((d) => <Layer key={d.id} {...(d as LayerProps)} />);

export const QuakeMapNative = forwardRef<QuakeMapHandle, Props>(function QuakeMapNative(
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
    scaleBar = false,
    onViewportChange,
  },
  ref,
) {
  const camera = useRef<CameraRef>(null);
  const assemblySource = useRef<GeoJSONSourceRef>(null);
  const mapRef = useRef<MapRef>(null);
  const scheme = currentScheme();
  const STYLES = useMemo(() => styleChain(mapStyle, scheme), [mapStyle, scheme]);
  // Görünüm değişince yedek zinciri baştan başlar.
  const [fallback, setFallback] = useState({ style: mapStyle, index: 0 });
  const styleIndex = fallback.style === mapStyle ? fallback.index : 0;
  const setStyleIndex = (f: (i: number) => number) =>
    setFallback((prev) => ({ style: mapStyle, index: f(prev.style === mapStyle ? prev.index : 0) }));
  const [attempt, setAttempt] = useState(0);
  const failed = styleIndex >= STYLES.length;
  // Şehir adları işaretçi olarak çizilir (yazı tipi indirmeden, çevrimdışı da görünür).
  const [zoom, setZoom] = useState(initialZoom ?? (focus ? 5.9 : 4.8));
  const labels = useMemo(() => visibleLabels(zoom), [zoom]);
  const lightLabels = isLightMap(mapStyle, scheme);

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
    // Kümeye dokunma: dağılacağı yakınlaştırmaya git.
    const clusterId = f?.properties?.cluster_id as number | undefined;
    if (clusterId != null && f?.geometry.type === 'Point') {
      const [lon, lat] = f.geometry.coordinates as [number, number];
      assemblySource.current
        ?.getClusterExpansionZoom(clusterId)
        .then((z) => camera.current?.flyTo({ center: [lon, lat], zoom: Math.min(16, z + 0.5), duration: 500 }))
        .catch(() => camera.current?.flyTo({ center: [lon, lat], zoom: 14, duration: 500 }));
      return;
    }
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
      scaleBar={scaleBar}
      scaleBarPosition={{ bottom: bottomInset + 6, left: 12 }}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      touchRotate={interactive}
      contentInset={{ top: topInset, left: 0, right: 0, bottom: bottomInset }}
      accessibilityLabel="Deprem haritası"
      onRegionDidChange={(e) => {
        const z = Math.round(e.nativeEvent.zoom * 2) / 2;
        if (z !== zoom) setZoom(z);
        onViewportChange?.({ bounds: e.nativeEvent.bounds as [number, number, number, number], zoom: e.nativeEvent.zoom });
      }}
      onDidFinishLoadingMap={async () => {
        // İlk görünüm için de bildir (kullanıcı kaydırmadan önce yakındaki alanlar yüklensin).
        if (!onViewportChange) return;
        const [b, z] = await Promise.all([mapRef.current?.getBounds(), mapRef.current?.getZoom()]).catch(() => [null, null]);
        if (b && z != null) onViewportChange({ bounds: b as [number, number, number, number], zoom: z as number });
      }}
    >
      <Camera ref={camera} initialViewState={{ center: initialCenter, zoom: initialZoom ?? (focus ? 5.9 : 4.8) }} minZoom={3} maxZoom={16} />

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
        <GeoJSONSource ref={assemblySource} id="assembly" data={assemblyData} onPress={handlePress} hitbox={HITBOX} {...ASSEMBLY_CLUSTER}>
          {renderLayers(ASSEMBLY_LAYERS)}
        </GeoJSONSource>
      ) : null}

      {layers.quakes ? (
        <GeoJSONSource id="quakes" data={quakeData} onPress={handlePress} hitbox={HITBOX}>
          {renderLayers(QUAKE_LAYERS)}
        </GeoJSONSource>
      ) : null}

      {labels.map((l) => (
        <Marker key={`lbl-${l.name}`} id={`lbl-${l.name}`} lngLat={[l.longitude, l.latitude]}>
          <View pointerEvents="none" style={{ alignItems: 'center' }}>
            {l.sea ? null : <View style={[styles.cityDot, lightLabels && styles.cityDotLight]} />}
            <AppText
              variant="label"
              color={l.sea ? (lightLabels ? '#3F6E9E' : '#4C86C6') : lightLabels ? '#1F2D3D' : '#F2F6FA'}
              style={[
                l.sea ? styles.seaLabel : l.rank === 1 ? styles.cityXL : l.rank === 2 ? styles.cityL : styles.cityM,
                lightLabels ? styles.haloLight : styles.haloDark,
              ]}
            >
              {l.name}
            </AppText>
          </View>
        </Marker>
      ))}

      {/* Olay yeri bildirimleri referanstaki gibi kategori simgeli pin; sarsıntı bildirimleri renkli nokta olarak kalır. */}
      {layers.reports
        ? reports
            .filter((r) => r.category !== 'shake' && r.latitude != null && r.longitude != null)
            .slice(0, MAX_REPORT_MARKERS)
            .map((r) => {
              const m = CATEGORY_META[r.category];
              return (
                <Marker
                  key={`rp-${r.id}`}
                  id={`rp-${r.id}`}
                  lngLat={[r.longitude!, r.latitude!]}
                  onPress={() => onSelect({ kind: 'report', id: r.id })}
                >
                  <View style={[styles.reportPin, { backgroundColor: m.color, boxShadow: `0 0 14px ${m.color}AA` }]} accessibilityLabel={`${m.label} bildirimi`}>
                    <Ionicons name={m.icon} size={15} color={r.category === 'help' ? '#3A2A00' : '#fff'} />
                  </View>
                </Marker>
              );
            })
        : null}

      {/* Simgeli işaretçi yalnızca kullanıcının kendi alanı için; resmî alanlar GPU katmanıyla (kümelenerek) çizilir. */}
      {layers.assembly
        ? assemblyPoints.filter((p) => p.isUserSaved).map((p) => (
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
        ? family.map((f) => {
            const c =
              f.status === 'safe'
                ? colors.safe
                : f.status === 'help'
                  ? colors.danger
                  : f.status === 'waiting'
                    ? colors.warning
                    : colors.info;
            return (
              <Marker key={f.id} id={`fam-${f.id}`} lngLat={[f.longitude, f.latitude]}>
                <View
                  style={{ alignItems: 'center' }}
                  accessibilityLabel={`${f.name}: ${f.label ?? ''}, ${relativeTimeTr(f.at)}${f.stale ? ' (eski konum)' : ''}`}
                >
                  {f.id === 'me' ? (
                    // Kullanıcının kendisi: referanstaki gibi mavi konum noktası
                    <View style={styles.userHalo}>
                      <View style={styles.userRing}>
                        <View style={styles.userDot} />
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.famPin, { borderColor: c }, f.stale && { opacity: 0.6 }]}>
                      {f.photoUri ? (
                        <Image source={{ uri: f.photoUri }} style={styles.famPhoto} contentFit="cover" />
                      ) : (
                        <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                          {f.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
                        </AppText>
                      )}
                    </View>
                  )}
                  <View style={[styles.famLabel, { backgroundColor: (f.id === 'me' ? colors.primary : c) + 'E6' }]}>
                    <AppText variant="caption" color="#fff" numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '700' }}>
                      {f.label ?? f.name}
                      {f.stale ? ' · eski' : ''}
                    </AppText>
                  </View>
                </View>
              </Marker>
            );
          })
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

const styles = themedStyles(() => ({
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
  reportPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  cityDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F2F6FA', borderWidth: 1, borderColor: '#030B14', marginBottom: 1 },
  cityDotLight: { backgroundColor: '#1F2D3D', borderColor: '#FFFFFF' },
  cityXL: { fontSize: 16, fontWeight: '800' },
  cityL: { fontSize: 13, fontWeight: '700' },
  cityM: { fontSize: 11, fontWeight: '600' },
  seaLabel: { fontSize: 11, fontStyle: 'italic', fontWeight: '600', letterSpacing: 0.4 },
  haloDark: { textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  haloLight: { textShadowColor: 'rgba(255,255,255,0.95)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } },
  famPhoto: { width: 38, height: 38, borderRadius: 19 },
  famPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px rgba(0,0,0,0.5)',
  },
  famLabel: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: -6 },
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
}));
