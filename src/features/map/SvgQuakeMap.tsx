import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { CATEGORY_META, feltColor } from '@/features/reports/categories';
import { colors, currentScheme, themedStyles } from '@/theme';
import type { LatLng } from '@/utils/geo';
import { DISTANCE_RINGS_KM } from './geojson';
import { isLightMap, paletteFor } from './mapStyle';
import type { QuakeMapHandle, QuakeMapProps } from './mapTypes';
import TR from './offline/turkey.json';
import { visibleLabels } from './offline/base';

/**
 * Yerel harita modülü olmadan (Expo Go) çalışan basit harita: uygulamaya gömülü Natural Earth
 * altlığını Web Mercator ile SVG olarak çizer. Kaydırma ve iki parmakla yakınlaştırma desteklenir.
 * Uydu görüntüsü ve sokak ayrıntısı yoktur; tam harita geliştirme/mağaza derlemesinde gelir.
 */
// MapLibre ile aynı yakınlaştırma ölçeği (512 px karo)
const TILE = 512;
export const toWorld = (lon: number, lat: number): [number, number] => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return [((lon + 180) / 360) * TILE, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE];
};
export const fromWorld = (x: number, y: number): LatLng => {
  const lon = (x / TILE) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / TILE;
  return { longitude: lon, latitude: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))) };
};

type Geo = GeoJSON.Geometry;
function ringPath(coords: number[][], close: boolean) {
  let d = '';
  coords.forEach(([lon, lat], i) => {
    const [x, y] = toWorld(lon!, lat!);
    d += `${i ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`;
  });
  return close ? `${d}Z` : d;
}
function geomPath(g: Geo): string {
  switch (g.type) {
    case 'Polygon':
      return g.coordinates.map((r) => ringPath(r, true)).join('');
    case 'MultiPolygon':
      return g.coordinates.map((p) => p.map((r) => ringPath(r, true)).join('')).join('');
    case 'LineString':
      return ringPath(g.coordinates, false);
    case 'MultiLineString':
      return g.coordinates.map((l) => ringPath(l, false)).join('');
    default:
      return '';
  }
}

type Layers = 'land' | 'turkey' | 'lakes' | 'provinces' | 'borders' | 'roads' | 'roadsMinor';
let cache: Record<Layers, string> | null = null;
function basePaths() {
  if (cache) return cache;
  const d = TR as unknown as Record<string, GeoJSON.FeatureCollection>;
  const join = (fc: GeoJSON.FeatureCollection, f?: (p: GeoJSON.GeoJsonProperties) => boolean) =>
    fc.features
      .filter((x) => !f || f(x.properties))
      .map((x) => geomPath(x.geometry))
      .join('');
  cache = {
    land: join(d.land!),
    turkey: join(d.turkey!),
    lakes: join(d.lakes!),
    provinces: join(d.provinces!),
    borders: join(d.borders!),
    roads: join(d.roads!, (p) => p?.major === 1),
    roadsMinor: join(d.roads!, (p) => p?.major !== 1),
  };
  return cache;
}

const TURKEY: LatLng = { latitude: 39.0, longitude: 35.2 };
const clampZoom = (z: number) => Math.max(4, Math.min(11, z));

export const SvgQuakeMap = forwardRef<QuakeMapHandle, QuakeMapProps>(function SvgQuakeMap(
  {
    events,
    focus,
    reports,
    assemblyPoints,
    user,
    layers,
    onSelect,
    initialCenter,
    initialZoom,
    mapStyle = 'dark',
    interactive = true,
    family = [],
  },
  ref,
) {
  const scheme = currentScheme();
  const pal = paletteFor(mapStyle, scheme);
  const light = isLightMap(mapStyle, scheme);
  const paths = useMemo(basePaths, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const start = initialCenter ?? (focus ? { latitude: focus.primary.latitude, longitude: focus.primary.longitude } : (user ?? TURKEY));
  const [view, setView] = useState(() => ({ c: toWorld(start.longitude, start.latitude), z: clampZoom(initialZoom ?? (focus ? 5.9 : 4.8)) }));
  const viewRef = useRef(view);
  viewRef.current = view;
  // Konum/odak sonradan gelirse, kullanıcı haritayı kaydırmadıysa ona ortala.
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current) return;
    setView((v) => ({ ...v, c: toWorld(start.longitude, start.latitude) }));
  }, [start.latitude, start.longitude]);

  useImperativeHandle(ref, () => ({
    flyTo: (p, z = 10) => (touched.current = true) && setView({ c: toWorld(p.longitude, p.latitude), z: clampZoom(z) }),
    getCenter: async () => fromWorld(...viewRef.current.c),
  }));

  // Kaydırma ve iki parmakla yakınlaştırma
  const gesture = useRef<{ c: [number, number]; z: number; dist: number | null } | null>(null);
  const dist = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    return t.length >= 2 ? Math.hypot(t[0]!.pageX - t[1]!.pageX, t[0]!.pageY - t[1]!.pageY) : null;
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => interactive && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
        onPanResponderGrant: (e) => {
          touched.current = true;
          gesture.current = { c: viewRef.current.c, z: viewRef.current.z, dist: dist(e) };
        },
        onPanResponderMove: (e, g) => {
          const s = gesture.current;
          if (!s) return;
          const d = dist(e);
          let z = s.z;
          if (d && s.dist) z = clampZoom(s.z + Math.log2(d / s.dist));
          else if (d && !s.dist) s.dist = d;
          const k = 2 ** z;
          setView({ c: [s.c[0] - g.dx / k, s.c[1] - g.dy / k], z });
        },
        onPanResponderRelease: () => {
          gesture.current = null;
        },
      }),
    [interactive],
  );

  const k = 2 ** view.z;
  const tx = size.w / 2 - view.c[0] * k;
  const ty = size.h / 2 - view.c[1] * k;
  const project = (p: LatLng) => {
    const [x, y] = toWorld(p.longitude, p.latitude);
    return { x: x * k + tx, y: y * k + ty };
  };
  const inView = (q: { x: number; y: number }, pad = 40) => q.x > -pad && q.y > -pad && q.x < size.w + pad && q.y < size.h + pad;
  // 1 km'nin bu enlemdeki piksel karşılığı
  const kmPx = (lat: number) => (k * TILE) / (40075 * Math.cos((lat * Math.PI) / 180));

  const labels = visibleLabels(view.z);
  const zoomBy = (d: number) => {
    touched.current = true;
    setView((v) => ({ ...v, z: clampZoom(v.z + d) }));
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: pal.sea, overflow: 'hidden' }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessibilityLabel="Deprem haritası (basit görünüm)"
      {...pan.panHandlers}
    >
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          <G transform={`translate(${tx} ${ty}) scale(${k})`}>
            <Path d={paths.land} fill={pal.land} />
            <Path d={paths.turkey} fill={pal.turkey} />
            <Path d={paths.lakes} fill={pal.lake} />
            <Path d={paths.roadsMinor} fill="none" stroke={pal.roadMinor} strokeOpacity={0.55} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
            <Path d={paths.roads} fill="none" stroke={pal.road} strokeOpacity={0.8} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            <Path
              d={paths.provinces}
              fill="none"
              stroke={pal.province}
              strokeOpacity={pal.provinceOpacity}
              strokeWidth={0.8}
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
            />
            <Path d={paths.borders} fill="none" stroke={pal.border} strokeOpacity={0.7} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          </G>

          {layers.rings && focus
            ? [...DISTANCE_RINGS_KM].reverse().map((km, i) => {
                const p = project(focus.primary);
                const r = km * kmPx(focus.primary.latitude);
                const c = km <= 20 ? colors.danger : km <= 40 ? colors.warning : colors.caution;
                return <Circle key={km} cx={p.x} cy={p.y} r={r} fill={c} fillOpacity={0.07 + i * 0.03} stroke={c} strokeOpacity={0.5} />;
              })
            : null}

          {layers.reports
            ? reports
                .filter((r) => r.category === 'shake' && r.latitude != null && r.longitude != null)
                .map((r) => {
                  const p = project({ latitude: r.latitude!, longitude: r.longitude! });
                  return inView(p) ? (
                    <Circle key={r.id} cx={p.x} cy={p.y} r={5} fill={feltColor(r.feltIntensity)} stroke="#071522" strokeWidth={1.2} />
                  ) : null;
                })
            : null}

          {layers.quakes
            ? events.map((e) => {
                const p = project(e.primary);
                if (!inView(p)) return null;
                const isFocus = e.id === focus?.id;
                const m = e.primary.magnitude ?? 2;
                return (
                  <G key={e.id} onPress={() => onSelect({ kind: 'quake', id: e.id })}>
                    {isFocus ? <Circle cx={p.x} cy={p.y} r={26} fill={colors.danger} fillOpacity={0.3} /> : null}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={isFocus ? 12 : Math.max(3, Math.min(12, m * 2))}
                      fill={isFocus ? colors.danger : m >= 4 ? colors.warning : colors.caution}
                      stroke={isFocus ? '#FFD0D5' : '#030B14'}
                      strokeWidth={isFocus ? 2 : 1}
                    />
                    {isFocus ? <Circle cx={p.x} cy={p.y} r={4} fill="#fff" /> : null}
                  </G>
                );
              })
            : null}
        </Svg>
      ) : null}

      {/* Şehir adları ve simgeli işaretçiler (dokunulabilir görünümler) */}
      {size.w > 0
        ? labels.map((l) => {
            const p = project(l);
            if (!inView(p, 0)) return null;
            return (
              <View key={`l-${l.name}`} pointerEvents="none" style={[styles.label, { left: p.x - 60, top: p.y - 8 }]}>
                <AppText
                  variant="label"
                  color={l.sea ? '#4C86C6' : light ? '#1F2D3D' : '#F2F6FA'}
                  style={[l.sea ? styles.sea : l.rank === 1 ? styles.xl : l.rank === 2 ? styles.l : styles.m, light ? styles.haloL : styles.haloD]}
                >
                  {l.name}
                </AppText>
              </View>
            );
          })
        : null}

      {size.w > 0 && layers.reports
        ? reports
            .filter((r) => r.category !== 'shake' && r.latitude != null && r.longitude != null)
            .slice(0, 30)
            .map((r) => {
              const p = project({ latitude: r.latitude!, longitude: r.longitude! });
              if (!inView(p)) return null;
              const m = CATEGORY_META[r.category];
              return (
                <Pressable
                  key={`r-${r.id}`}
                  onPress={() => onSelect({ kind: 'report', id: r.id })}
                  accessibilityLabel={`${m.label} bildirimi`}
                  style={[styles.pin, { left: p.x - 14, top: p.y - 14, backgroundColor: m.color }]}
                >
                  <Ionicons name={m.icon} size={14} color={r.category === 'help' ? '#3A2A00' : '#fff'} />
                </Pressable>
              );
            })
        : null}

      {size.w > 0 && layers.assembly
        ? assemblyPoints.slice(0, 12).map((a) => {
            const p = project(a);
            if (!inView(p)) return null;
            return (
              <Pressable
                key={`a-${a.id}`}
                onPress={() => onSelect({ kind: 'assembly', id: a.id })}
                accessibilityLabel={`Toplanma alanı: ${a.name}`}
                style={[styles.assembly, { left: p.x - 18, top: p.y - 18 }]}
              >
                <Ionicons name={a.isUserSaved ? 'flag' : 'people'} size={16} color={colors.safe} />
              </Pressable>
            );
          })
        : null}

      {size.w > 0 && layers.family
        ? family.map((f) => {
            const p = project(f);
            if (!inView(p)) return null;
            const me = f.id === 'me';
            const c = me ? colors.primary : f.status === 'safe' ? colors.safe : f.status === 'help' ? colors.danger : colors.info;
            return (
              <View key={`f-${f.id}`} pointerEvents="none" style={[styles.fam, { left: p.x - 40, top: p.y - 18 }]}>
                {me ? (
                  <View style={styles.meHalo}>
                    <View style={styles.meDot} />
                  </View>
                ) : (
                  <View style={[styles.famDot, { borderColor: c }]}>
                    <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                      {f.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
                    </AppText>
                  </View>
                )}
                <View style={[styles.famLabel, { backgroundColor: c }]}>
                  <AppText variant="caption" color="#fff" numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '700' }}>
                    {f.label ?? f.name}
                  </AppText>
                </View>
              </View>
            );
          })
        : null}

      {size.w > 0 && user && !family.some((f) => f.id === 'me')
        ? (() => {
            const p = project(user);
            return inView(p) ? (
              <View pointerEvents="none" style={[styles.meHalo, { position: 'absolute', left: p.x - 22, top: p.y - 22 }]}>
                <View style={styles.meDot} />
              </View>
            ) : null;
          })()
        : null}

      {interactive ? (
        <View style={styles.zoom}>
          <Pressable onPress={() => zoomBy(1)} accessibilityRole="button" accessibilityLabel="Yakınlaştır" style={styles.zoomBtn}>
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => zoomBy(-1)} accessibilityRole="button" accessibilityLabel="Uzaklaştır" style={styles.zoomBtn}>
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

const styles = themedStyles(() => ({
  label: { position: 'absolute', width: 120, alignItems: 'center' },
  xl: { fontSize: 15, fontWeight: '800' },
  l: { fontSize: 12.5, fontWeight: '700' },
  m: { fontSize: 10.5, fontWeight: '600' },
  sea: { fontSize: 11, fontStyle: 'italic', fontWeight: '600' },
  haloD: { textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  haloL: { textShadowColor: 'rgba(255,255,255,0.95)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } },
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  assembly: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,42,32,0.92)',
    borderWidth: 2,
    borderColor: colors.safe,
  },
  fam: { position: 'absolute', width: 80, alignItems: 'center' },
  famDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  famLabel: { marginTop: -4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 },
  meHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22,131,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff' },
  zoom: { position: 'absolute', left: 8, top: 8, gap: 6 },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mapPanel,
    borderWidth: 1,
    borderColor: colors.mapPanelBorder,
  },
}));
