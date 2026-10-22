import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StateMessage } from '@/components/ui';
import { env } from '@/services/env';
import { colors } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { UserReport } from '@/types/report';
import type { LatLng } from '@/utils/geo';
import { assemblyToGeoJSON, quakesToGeoJSON, reportsToGeoJSON, ringsToGeoJSON } from './geojson';

export type MapLayers = { quakes: boolean; rings: boolean; reports: boolean; assembly: boolean };
export const DEFAULT_LAYERS: MapLayers = { quakes: true, rings: true, reports: true, assembly: true };

export type MapSelection =
  | { kind: 'quake'; id: string }
  | { kind: 'report'; id: string }
  | { kind: 'assembly'; id: string };

export interface QuakeMapHandle {
  flyTo: (p: LatLng, zoom?: number) => void;
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
  /** Haritanın alt kısmında kaplamalar (lejant vb.) için boşluk */
  bottomInset?: number;
};

const TURKEY_CENTER: [number, number] = [35.2, 39.0];

/** Assembly marker'ları görünüm başına sınırlı (performans için view annotation sayısı). */
const MAX_ASSEMBLY_MARKERS = 40;

export const QuakeMap = forwardRef<QuakeMapHandle, Props>(function QuakeMap(
  { events, focus, reports, assemblyPoints, user, userIsPrecise, layers, onSelect, bottomInset = 0 },
  ref,
) {
  const camera = useRef<CameraRef>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useImperativeHandle(ref, () => ({
    flyTo: (p, zoom = 10) => camera.current?.flyTo({ center: [p.longitude, p.latitude], zoom, duration: 800 }),
  }));

  const quakeData = useMemo(() => quakesToGeoJSON(events, focus?.id ?? null), [events, focus]);
  const ringData = useMemo(() => ringsToGeoJSON(focus), [focus]);
  const reportData = useMemo(() => reportsToGeoJSON(reports), [reports]);
  const assemblyShown = useMemo(() => assemblyPoints.slice(0, MAX_ASSEMBLY_MARKERS), [assemblyPoints]);
  const assemblyData = useMemo(() => assemblyToGeoJSON(assemblyPoints), [assemblyPoints]);

  const initialCenter: [number, number] = focus ? [focus.primary.longitude, focus.primary.latitude] : user ? [user.longitude, user.latitude] : TURKEY_CENTER;

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
            setFailed(false);
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
      key={attempt}
      style={StyleSheet.absoluteFill}
      mapStyle={env.mapStyleUrl}
      onDidFailLoadingMap={() => setFailed(true)}
      logo={false}
      attribution
      attributionPosition={{ top: 8, left: 8 }}
      compass={false}
      touchPitch={false}
      contentInset={{ top: 0, left: 0, right: 0, bottom: bottomInset }}
      accessibilityLabel="Deprem haritası"
    >
      <Camera ref={camera} initialViewState={{ center: initialCenter, zoom: focus ? 6.6 : 5 }} minZoom={3} maxZoom={16} />

      {layers.rings ? (
        <GeoJSONSource id="rings" data={ringData}>
          <Layer
            id="rings-fill"
            type="fill"
            paint={{
              'fill-color': ['match', ['get', 'km'], 25, colors.danger, 50, colors.warning, colors.caution],
              'fill-opacity': ['match', ['get', 'km'], 25, 0.22, 50, 0.12, 0.06],
            }}
          />
          <Layer
            id="rings-line"
            type="line"
            paint={{ 'line-color': colors.danger, 'line-opacity': 0.5, 'line-width': 1, 'line-dasharray': [2, 2] }}
          />
        </GeoJSONSource>
      ) : null}

      {layers.reports ? (
        <GeoJSONSource id="reports" data={reportData} onPress={handlePress} hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <Layer
            id="reports-circle"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 7],
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#0B1928',
              'circle-stroke-width': 1.5,
            }}
          />
        </GeoJSONSource>
      ) : null}

      {layers.quakes ? (
        <GeoJSONSource id="quakes" data={quakeData} onPress={handlePress} hitbox={{ top: 14, right: 14, bottom: 14, left: 14 }}>
          <Layer
            id="quakes-halo"
            type="circle"
            filter={['==', ['get', 'focus'], true]}
            paint={{ 'circle-radius': 22, 'circle-color': colors.danger, 'circle-opacity': 0.28, 'circle-blur': 0.4 }}
          />
          <Layer
            id="quakes-circle"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1, 3, 3, 5, 5, 10, 7, 16],
              'circle-color': ['case', ['==', ['get', 'focus'], true], colors.danger, ['get', 'color']],
              'circle-opacity': 0.9,
              'circle-stroke-color': ['case', ['==', ['get', 'focus'], true], '#ffffff', '#030B14'],
              'circle-stroke-width': ['case', ['==', ['get', 'focus'], true], 3, 1],
            }}
          />
        </GeoJSONSource>
      ) : null}

      {layers.assembly ? (
        <>
          {/* Uzak yakınlaştırmada hafif daire katmanı, yakında simgeli işaretçi */}
          <GeoJSONSource id="assembly" data={assemblyData} onPress={handlePress} hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Layer
              id="assembly-circle"
              type="circle"
              paint={{ 'circle-radius': 6, 'circle-color': colors.safe, 'circle-stroke-color': '#062A20', 'circle-stroke-width': 2 }}
            />
          </GeoJSONSource>
          {assemblyShown.slice(0, 12).map((p) => (
            <Marker key={p.id} id={`ap-${p.id}`} lngLat={[p.longitude, p.latitude]} onPress={() => onSelect({ kind: 'assembly', id: p.id })}>
              <View style={styles.assemblyMarker} accessibilityLabel={`Toplanma alanı: ${p.name}`}>
                <Ionicons name="people" size={16} color={colors.safe} />
              </View>
            </Marker>
          ))}
        </>
      ) : null}

      {user ? (
        <Marker id="me" lngLat={[user.longitude, user.latitude]}>
          <View style={styles.userOuter} accessibilityLabel={userIsPrecise ? 'Konumunuz' : 'Seçtiğiniz il (yaklaşık)'}>
            <View style={[styles.userInner, !userIsPrecise && { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary }]} />
          </View>
        </Marker>
      ) : null}
    </Map>
  );
});

const styles = StyleSheet.create({
  error: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  assemblyMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#062A20',
    borderWidth: 2,
    borderColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22,131,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(22,131,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff' },
});
