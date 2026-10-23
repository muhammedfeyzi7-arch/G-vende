import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { Icon } from '@/components/ds';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { EDEVLET_ASSEMBLY_URL, getSaved, openDirections, toggleSaved } from '@/features/assembly-points/api';
import { displayPoint } from '@/features/assembly-points/format';
import { addRouteHistory, loadRouteHistory, type RouteHistoryItem } from '@/features/assembly-points/routeHistory';
import { MIN_ASSEMBLY_ZOOM, mergeAssembly, useAssemblyInView } from '@/features/assembly-points/useAssemblyInView';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { computeAlertState } from '@/features/earthquakes/alertState';
import { formatMagnitude, placeTitle } from '@/features/earthquakes/format';
import { useFamily } from '@/features/family/useFamily';
import { LayerPanel, type MapFilters } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap, type FamilyPin, type MapSelection, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { SelectionCard } from '@/features/map/SelectionCard';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';
import type { AssemblyPoint } from '@/types/assembly';
import { distanceKm, formatDistance, type LatLng } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';

type SheetTab = 'near' | 'all' | 'fav' | 'history';
const SHEET_TABS: { key: SheetTab; label: string }[] = [
  { key: 'near', label: 'Yakınınızdaki' },
  { key: 'all', label: 'Tümü' },
  { key: 'fav', label: 'Favorilerim' },
  { key: 'history', label: 'Rota Geçmişi' },
];
type Row = AssemblyPoint & { distanceKm: number; routedAt?: string };

const lowerTr = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
const matches = (p: AssemblyPoint, q: string) =>
  !q || [p.name, p.district, p.neighborhood, p.address, p.province].some((v) => v && lowerTr(v).includes(q));
/** Yürüme süresi tahmini (~4,5 km/sa, düz çizgi mesafesinden; gerçek rota daha uzun olabilir). */
const walkMin = (km: number) => (Number.isFinite(km) ? Math.max(1, Math.round((km / 4.5) * 60)) : null);

function SourceBadge({ p }: { p: AssemblyPoint }) {
  const user = p.isUserSaved;
  const official = !user && p.sourceKind !== 'community';
  const color = user ? colors.primary : official ? colors.safe : colors.warning;
  const label = user ? 'Kendi kaydınız' : official ? p.sourceName : 'Topluluk verisi (OSM)';
  return (
    <View style={[styles.badge, { backgroundColor: alpha(color, 0.14) }]}>
      <Ionicons name={official ? 'checkmark-circle' : user ? 'bookmark' : 'people-outline'} size={12} color={color} />
      <AppText variant="caption" color={color} numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', flexShrink: 1 }}>
        {label}
      </AppText>
    </View>
  );
}

function PointRow({
  p,
  fav,
  selected,
  onPress,
  onRoute,
  onFav,
}: {
  p: Row;
  fav: boolean;
  selected: boolean;
  onPress: () => void;
  onRoute: () => void;
  onFav: () => void;
}) {
  const mins = walkMin(p.distanceKm);
  const place = [Number.isFinite(p.distanceKm) ? formatDistance(p.distanceKm) : null, p.district, p.neighborhood]
    .filter(Boolean)
    .join(' • ');
  const tint = p.isUserSaved ? colors.primary : p.sourceKind === 'community' ? colors.warning : colors.safe;
  return (
    <View style={[styles.row, selected && { borderColor: colors.primary }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}. ${place}. Haritada göster`}
        style={styles.rowMain}
      >
        <View style={[styles.rowIcon, { backgroundColor: alpha(tint, 0.16), borderColor: alpha(tint, 0.5) }]}>
          <Ionicons name="people" size={16} color={tint} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="heading" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>
            {p.name}
          </AppText>
          {place ? (
            <AppText variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
              {place}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {p.capacity ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
                <AppText variant="caption" style={{ fontSize: 11 }}>
                  Kapasite: {p.capacity.toLocaleString('tr-TR')} kişi
                </AppText>
              </View>
            ) : null}
            <SourceBadge p={p} />
            {p.routedAt ? (
              <AppText variant="caption" style={{ fontSize: 10.5 }}>
                Rota: {relativeTimeTr(p.routedAt)}
              </AppText>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onFav}
        accessibilityRole="button"
        accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        hitSlop={8}
        style={styles.fav}
      >
        <Ionicons name={fav ? 'star' : 'star-outline'} size={18} color={fav ? '#F7B548' : colors.textMuted} />
      </Pressable>
      <Pressable
        onPress={onRoute}
        accessibilityRole="button"
        accessibilityLabel={`${p.name} için yol tarifini harita uygulamasında aç${mins ? `, yürüyerek yaklaşık ${mins} dakika` : ''}`}
        style={({ pressed }) => [styles.route, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="navigate-outline" size={20} color={colors.primary} />
        <AppText variant="label" color={colors.primary} style={{ fontSize: 12, fontWeight: '700' }}>
          Rota
        </AppText>
        {mins ? (
          <AppText variant="caption" style={{ fontSize: 10.5 }}>
            ~{mins} dk
          </AppText>
        ) : null}
      </Pressable>
    </View>
  );
}

function MapTool({ icon, label, onPress, active }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tool, active && { borderColor: colors.primary }, pressed && { opacity: 0.85 }]}
    >
      <Icon name={icon} size={19} color={active ? colors.primary : colors.text} />
      <AppText variant="caption" color={colors.text} style={{ fontSize: 9.5 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Harita sekmesi: toplanma alanlarına hızlı erişim. Gerçek MapLibre haritası, arama, katman
 * filtreleri ve haritayla eşleşen liste paneli. Rota hesaplanmaz; yol tarifi cihazın harita
 * uygulamasında açılır.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const toast = useToast();
  const { focus: focusParam } = useLocalSearchParams<{ focus?: string }>();
  const { quakes, userCoords, location, settings, online } = useApp();
  const [detailFailed, setDetailFailed] = useState(false);
  const events = useVisibleQuakes();
  const feed = useReports();
  const nearby = useNearbyAssembly(userCoords, 10);
  const family = useFamily();
  const mapRef = useRef<QuakeMapHandle>(null);
  const inView = useAssemblyInView();
  const view = useRef<{ center: LatLng; zoom: number } | null>(null);
  const [zoom, setZoom] = useState(0);

  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [damage, setDamage] = useState(true);
  const [panel, setPanel] = useState<null | 'layers' | 'filters'>(null);
  const [filters, setFilters] = useState<MapFilters>({ hours: 24, minMag: 0 });
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [sheet, setSheet] = useState<'half' | 'min' | 'full'>('half');
  const [tab, setTab] = useState<SheetTab>('near');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<AssemblyPoint[]>([]);
  const [history, setHistory] = useState<RouteHistoryItem[]>([]);

  // Konum ilk kez belli olunca haritayı şehir ölçeğinde kullanıcıya odakla (bir kez).
  const centered = useRef(false);
  useEffect(() => {
    if (!userCoords || centered.current || focusParam) return;
    centered.current = true;
    const t = setTimeout(() => mapRef.current?.flyTo(userCoords, location.status === 'granted' ? 13 : 10), 300);
    return () => clearTimeout(t);
  }, [userCoords, location.status, focusParam]);

  useFocusEffect(
    useCallback(() => {
      getSaved().then(setSaved);
      loadRouteHistory().then(setHistory);
    }, []),
  );

  const mapAssembly = useMemo(() => mergeAssembly(nearby.points, inView.points), [nearby.points, inView.points]);
  const alert = useMemo(() => computeAlertState(events, userCoords), [events, userCoords]);
  const focus = useMemo(
    () => events.find((e) => e.id === focusParam) ?? (alert.kind === 'recent-significant' ? alert.event : null),
    [events, focusParam, alert],
  );
  const mapEvents = useMemo(() => {
    const shown = events.filter(
      (e) => Date.now() - Date.parse(e.primary.occurredAt) <= filters.hours * 3600_000 && (e.primary.magnitude ?? 0) >= filters.minMag,
    );
    return focus && !shown.some((e) => e.id === focus.id) ? [focus, ...shown] : shown;
  }, [events, filters, focus]);
  // "Hasar" filtresi: kullanıcıların hasar bildirimleri; diğer bildirimler "Depremler" katmanıyla birlikte.
  const mapReports = useMemo(
    () => feed.reports.filter((r) => (r.category === 'damage' ? damage : layers.quakes)),
    [feed.reports, damage, layers.quakes],
  );
  const familyPins: FamilyPin[] = useMemo(() => {
    if (family.state.status !== 'ready') return [];
    const me = family.state.me;
    const seen = new Set<string>();
    return family.state.groups.flatMap((g) =>
      g.members
        .filter((m) => m.userId !== me && m.lastCheckin?.location && !seen.has(m.userId) && seen.add(m.userId))
        .map((m) => ({
          id: m.userId,
          name: m.displayName,
          latitude: m.lastCheckin!.location!.latitude,
          longitude: m.lastCheckin!.location!.longitude,
          at: m.lastCheckin!.at,
          stale: Date.now() - Date.parse(m.lastCheckin!.at) > 30 * 60_000,
          status: m.lastCheckin!.status === 'safe' ? ('safe' as const) : ('help' as const),
          label: m.lastCheckin!.status === 'safe' ? 'Güvende' : 'Yardım istiyor',
        })),
    );
  }, [family.state]);

  const q = lowerTr(query.trim());
  const ref = userCoords ?? view.current?.center ?? null;
  const withDist = useCallback((p: AssemblyPoint): Row => ({ ...p, distanceKm: ref ? distanceKm(ref, p) : NaN }), [ref]);
  const rows: Row[] = useMemo(() => {
    const list =
      tab === 'near'
        ? (nearby.points as Row[]).map((p) => ({ ...p, distanceKm: (p as Row).distanceKm ?? (ref ? distanceKm(ref, p) : NaN) }))
        : tab === 'all'
          ? mapAssembly.map(withDist).sort((a, b) => a.distanceKm - b.distanceKm)
          : tab === 'fav'
            ? saved.map(withDist)
            : history.map((h) => ({ ...withDist(displayPoint(h.point)), routedAt: h.at }));
    return list.filter((p) => matches(p, q));
  }, [tab, nearby.points, mapAssembly, saved, history, q, ref, withDist]);
  const selectedId = selection?.kind === 'assembly' ? selection.id : null;

  const flyTo = (p: LatLng, z: number) => mapRef.current?.flyTo(p, z);
  const showPoint = (p: AssemblyPoint) => {
    flyTo(p, 15);
    setSelection({ kind: 'assembly', id: p.id });
    if (sheet === 'full') setSheet('half');
  };
  const route = async (p: AssemblyPoint) => {
    try {
      await openDirections(p);
      setHistory(await addRouteHistory(p));
    } catch {
      Alert.alert('Harita uygulaması açılamadı', 'Yol tarifi için cihazınızda bir harita uygulaması bulunmalı.');
    }
  };
  const fav = async (p: AssemblyPoint) => setSaved(await toggleSaved(p));
  const locate = () => (userCoords ? flyTo(userCoords, location.status === 'granted' ? 13 : 9) : router.push('/konum'));
  const zoomBy = (d: number) => {
    const v = view.current;
    if (v) flyTo(v.center, Math.max(4, Math.min(18, v.zoom + d)));
  };
  const drawRoute = () => {
    const target = mapAssembly.find((p) => p.id === selectedId) ?? (nearby.points[0] as AssemblyPoint | undefined) ?? null;
    if (!target)
      return Alert.alert(
        'Hedef alan yok',
        userCoords ? 'Haritadan bir toplanma alanı seçin.' : 'Önce konumunuzu belirleyin veya haritadan bir toplanma alanı seçin.',
      );
    Alert.alert(
      'Yol tarifi',
      `“${target.name}” için yaya yol tarifi cihazınızın harita uygulamasında açılsın mı? Rotanın güvenliği garanti edilmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Aç', onPress: () => route(target) },
      ],
    );
  };
  const search = async () => {
    const text = query.trim();
    if (!text) return;
    const hit = rows[0];
    if (hit) return showPoint(hit);
    try {
      const r = await Location.geocodeAsync(`${text}, Türkiye`);
      if (r[0]) {
        flyTo({ latitude: r[0].latitude, longitude: r[0].longitude }, 14);
        setTab('all');
        return;
      }
      toast.show({ text: 'Adres bulunamadı', tone: 'warning' });
    } catch {
      toast.show({ text: 'Adres araması bu cihazda kullanılamıyor', tone: 'warning' });
    }
  };
  const unavailable = (what: string) =>
    Alert.alert(`${what} verisi yok`, `${what} için doğrulanmış bir açık veri kaynağı henüz bağlı değil. Uydurma işaret gösterilmez.`);

  // Kısa ekranlarda (ör. iPhone SE) liste daha az yer kaplar, yakınlaştırma düğmeleri gizlenir (sıkıştırma hareketi kullanılır).
  const short = height < 720;
  const sheetH = sheet === 'min' ? 64 : sheet === 'half' ? Math.round(height * (short ? 0.3 : 0.34)) : undefined;
  const chips = [
    {
      key: 'assembly',
      label: 'Toplanma Alanları',
      icon: 'people',
      color: colors.safe,
      on: layers.assembly,
      press: () => setLayers((l) => ({ ...l, assembly: !l.assembly })),
    },
    { key: 'damage', label: 'Hasar', icon: 'home', color: '#FF4B55', on: damage, press: () => setDamage((v) => !v) },
    {
      key: 'risk',
      label: 'Riskli Yapılar',
      icon: 'warning',
      color: '#F7B548',
      on: false,
      off: true,
      press: () => unavailable('Riskli yapı'),
    },
    {
      key: 'hosp',
      label: 'Hastaneler',
      icon: 'mci:hospital-building',
      color: '#4DA3FF',
      on: false,
      off: true,
      press: () => unavailable('Hastane'),
    },
    {
      key: 'quakes',
      label: 'Depremler',
      icon: 'pulse',
      color: '#FF8A24',
      on: layers.quakes,
      press: () => setLayers((l) => ({ ...l, quakes: !l.quakes, rings: !l.quakes })),
    },
    {
      key: 'faults',
      label: 'Fay Hatları',
      icon: 'git-commit-outline',
      color: '#C77DFF',
      on: layers.faults,
      press: () => setLayers((l) => ({ ...l, faults: !l.faults })),
    },
  ];

  const emptyText = (): { text: string; action?: { label: string; onPress: () => void } } | null => {
    if (rows.length) return null;
    if (q) return { text: 'Aramanızla eşleşen alan yok. Adres aramak için klavyede “Ara”ya basın.' };
    if (tab === 'near') {
      const s = nearby.state;
      if (s.status === 'no-location')
        return { text: 'Yakındaki alanlar için konum gerekli.', action: { label: 'Konum seç', onPress: () => router.push('/konum') } };
      if (s.status === 'not-configured') return { text: 'Toplanma alanları sunucu bağlantısı gerektirir.' };
      if (s.status === 'error') return { text: s.error, action: { label: 'Tekrar dene', onPress: nearby.reload } };
      if (s.status === 'loading') return null;
      return {
        text: '10 km içinde kayıtlı toplanma alanı yok. Kendi alanınızı e-Devlet’ten öğrenebilirsiniz.',
        action: { label: 'e-Devlet’te sorgula', onPress: () => Linking.openURL(EDEVLET_ASSEMBLY_URL) },
      };
    }
    if (tab === 'all') {
      if (zoom < MIN_ASSEMBLY_ZOOM) return { text: 'Haritada görünen alandaki toplanma alanlarını görmek için yakınlaştırın.' };
      if (inView.status === 'error') return { text: 'Lütfen internet bağlantınızı kontrol edin.' };
      if (inView.status === 'loading') return null;
      return { text: 'Haritanın bu bölümünde kayıtlı toplanma alanı yok.' };
    }
    if (tab === 'fav') return { text: 'Favori alan yok. Bir alanın yanındaki yıldıza dokunarak ekleyin.' };
    return { text: 'Henüz yol tarifi açmadınız. “Rota”ya dokunduğunuz alanlar burada listelenir.' };
  };
  const loadingList =
    !rows.length &&
    !q &&
    ((tab === 'near' && nearby.state.status === 'loading') || (tab === 'all' && zoom >= MIN_ASSEMBLY_ZOOM && inView.status === 'loading'));
  const empty = emptyText();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Başlık */}
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <AppText variant="display" accessibilityRole="header" style={{ fontSize: 27, lineHeight: 32 }}>
            Harita
          </AppText>
          <AppText variant="body" color={colors.textSecondary} numberOfLines={1} style={{ fontSize: 12.5 }}>
            Güvenli alanlara daha hızlı ulaşın.
          </AppText>
        </View>
        <Pressable
          onPress={() => setSheet((s) => (s === 'full' ? 'half' : 'full'))}
          accessibilityRole="button"
          accessibilityLabel={sheet === 'full' ? 'Harita görünümü' : 'Liste görünümü'}
          style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name={sheet === 'full' ? 'map-outline' : 'list'} size={16} color={colors.text} />
          <AppText variant="label" color={colors.text} style={{ fontSize: 12, fontWeight: '600' }}>
            {sheet === 'full' ? 'Harita Görünümü' : 'Liste Görünümü'}
          </AppText>
        </Pressable>
      </View>

      {/* Arama + Filtrele */}
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder="Adres, mahalle, ilçe ara..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Adres, mahalle veya ilçe ara"
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Aramayı temizle" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setPanel((p) => (p === 'filters' ? null : 'filters'))}
          accessibilityRole="button"
          accessibilityLabel="Filtrele"
          style={({ pressed }) => [
            styles.outlineBtn,
            styles.filterBtn,
            panel === 'filters' && { borderColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="options-outline" size={17} color={colors.text} />
          <AppText variant="label" color={colors.text} style={{ fontSize: 12, fontWeight: '600' }}>
            Filtrele
          </AppText>
          <Ionicons name={panel === 'filters' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Katman çipleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
        {chips.map((c) => (
          <Pressable
            key={c.key}
            onPress={c.press}
            accessibilityRole="switch"
            accessibilityState={{ checked: c.on, disabled: !!c.off }}
            accessibilityLabel={c.off ? `${c.label}: veri yok` : c.label}
            style={({ pressed }) => [
              styles.chip,
              c.on && { borderColor: c.color, backgroundColor: alpha(c.color, 0.12) },
              c.off && { opacity: 0.55 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon name={c.icon} size={15} color={c.color} />
            <AppText variant="label" color={colors.text} style={{ fontSize: 11.5, fontWeight: '600' }}>
              {c.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Harita */}
      <View style={[styles.map, sheet === 'full' && { flex: 0, height: 0 }]}>
        <QuakeMap
          ref={mapRef}
          mapStyle={settings.mapStyle}
          events={layers.quakes ? mapEvents : []}
          focus={focus}
          reports={mapReports}
          assemblyPoints={mapAssembly}
          onViewportChange={(v) => {
            inView.onViewport(v);
            const [w, s, e, n] = v.bounds;
            view.current = { center: { latitude: (s + n) / 2, longitude: (w + e) / 2 }, zoom: v.zoom };
            setZoom(v.zoom);
          }}
          onDetailUnavailable={() => setDetailFailed(true)}
          family={familyPins}
          user={userCoords}
          userIsPrecise={location.status === 'granted'}
          layers={{ ...layers, reports: damage || layers.quakes }}
          scaleBar
          onSelect={(s) => {
            setPanel(null);
            setSelection(s);
          }}
          bottomInset={selection ? 150 : 16}
        />
        {alert.kind === 'recent-significant' ? (
          <Pressable
            onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: alert.event.id } })}
            accessibilityRole="button"
            style={styles.alert}
          >
            <Ionicons name="pulse" size={16} color="#fff" />
            <AppText variant="label" color="#fff" numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: '700' }}>
              {alert.minutesAgo} dk önce {placeTitle(alert.event)} · {formatMagnitude(alert.event.primary.magnitude)}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </Pressable>
        ) : null}
        {!online || detailFailed ? (
          <View style={styles.notice} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
            <AppText variant="caption" color={colors.text} style={{ flex: 1, fontSize: 11 }}>
              Ayrıntılı harita yüklenemedi; yalnızca temel Türkiye haritası görünüyor. Lütfen internet bağlantınızı kontrol edin.
            </AppText>
          </View>
        ) : null}
        <View style={styles.tools}>
          <MapTool icon="locate" label="Konumum" onPress={locate} />
          <MapTool
            icon="layers"
            label="Katmanlar"
            active={panel === 'layers'}
            onPress={() => setPanel((p) => (p === 'layers' ? null : 'layers'))}
          />
          <MapTool icon="navigate-outline" label="Rota Çiz" onPress={drawRoute} />
        </View>
        {short ? null : (
          <View style={styles.zoom}>
            <Pressable onPress={() => zoomBy(1)} accessibilityRole="button" accessibilityLabel="Yakınlaştır" style={styles.zoomBtn}>
              <Ionicons name="add" size={24} color={colors.text} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Pressable onPress={() => zoomBy(-1)} accessibilityRole="button" accessibilityLabel="Uzaklaştır" style={styles.zoomBtn}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </Pressable>
          </View>
        )}
        {panel ? (
          <View style={styles.panelWrap}>
            <LayerPanel
              layers={layers}
              onChange={setLayers}
              filters={panel === 'filters' ? filters : undefined}
              onFilters={panel === 'filters' ? setFilters : undefined}
            />
          </View>
        ) : null}
        {selection ? (
          <View style={styles.selection} pointerEvents="box-none">
            <SelectionCard
              selection={selection}
              events={events}
              reports={feed.reports}
              assembly={mapAssembly}
              user={userCoords}
              onClose={() => setSelection(null)}
            />
          </View>
        ) : null}
      </View>

      {/* Liste paneli */}
      <View style={[styles.sheet, sheetH != null ? { height: sheetH } : { flex: 1 }]}>
        <Pressable
          onPress={() => setSheet((s) => (s === 'min' ? 'half' : s === 'half' ? 'min' : 'half'))}
          accessibilityRole="button"
          accessibilityLabel={sheet === 'min' ? 'Listeyi aç' : 'Listeyi küçült'}
          style={styles.grabberHit}
        >
          <View style={styles.grabber} />
        </Pressable>
        <View style={styles.tabs} accessibilityRole="tablist">
          {SHEET_TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => {
                setTab(t.key);
                if (sheet === 'min') setSheet('half');
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
              style={styles.tab}
            >
              <AppText
                variant="label"
                numberOfLines={1}
                color={tab === t.key ? colors.primary : colors.textSecondary}
                style={{ fontSize: short ? 11.5 : 13, fontWeight: tab === t.key ? '700' : '600' }}
              >
                {t.label}
              </AppText>
              <View style={[styles.tabLine, tab === t.key && { backgroundColor: colors.primary }]} />
            </Pressable>
          ))}
        </View>
        {sheet !== 'min' ? (
          <FlatList
            data={rows}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: spacing.sm, gap: spacing.xs + 2, paddingBottom: 36 }}
            initialNumToRender={8}
            windowSize={7}
            renderItem={({ item }) => (
              <PointRow
                p={item}
                fav={saved.some((s) => s.id === item.id)}
                selected={item.id === selectedId}
                onPress={() => showPoint(item)}
                onRoute={() => route(item)}
                onFav={() => fav(item)}
              />
            )}
            ListEmptyComponent={
              loadingList ? (
                <View style={{ gap: spacing.sm }} accessibilityLabel="Toplanma alanları yükleniyor">
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.row, { padding: spacing.md, gap: spacing.md }]}>
                      <Skeleton width={44} height={44} radius={22} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <Skeleton width="70%" height={13} />
                        <Skeleton width="45%" height={10} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : empty ? (
                <View style={styles.empty}>
                  <AppText variant="caption" style={{ fontSize: 13, textAlign: 'center' }}>
                    {empty.text}
                  </AppText>
                  {empty.action ? (
                    <Pressable onPress={empty.action.onPress} accessibilityRole="button" style={styles.emptyBtn}>
                      <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
                        {empty.action.label}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : undefined
            }
            ListFooterComponent={
              <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                <AppText variant="caption" style={{ fontSize: 11, lineHeight: 15 }}>
                  Resmî açık veri: İzmir, Bursa ve Konya belediyeleri. Diğer illerde OpenStreetMap topluluk kayıtları gösterilir; 81 ilin
                  tamamı kapsanmıyor. Size atanan alanı e-Devlet’ten doğrulayın. Yürüme süreleri düz çizgi mesafesinden tahmindir.
                </AppText>
                <View style={styles.links}>
                  {(
                    [
                      { label: 'Deprem kayıtları', icon: 'pulse', href: '/depremler' },
                      { label: 'Olay bildirimleri', icon: 'chatbubbles-outline', href: '/akis' },
                      { label: 'Tüm toplanma alanları', icon: 'flag-outline', href: '/toplanma' },
                    ] as const
                  ).map((l) => (
                    <Pressable key={l.href} onPress={() => router.push(l.href)} accessibilityRole="link" style={styles.link}>
                      <Ionicons name={l.icon} size={14} color={colors.primary} />
                      <AppText variant="caption" color={colors.primary} style={{ fontSize: 11.5, fontWeight: '600' }}>
                        {l.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                {quakes.error ? (
                  <AppText variant="caption" color={colors.warning} style={{ fontSize: 11 }}>
                    Deprem verisi: {quakes.error}
                  </AppText>
                ) : null}
              </View>
            }
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  searchRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontSize: 13.5, paddingVertical: 8, minWidth: 0 },
  filterBtn: { minHeight: 40, borderRadius: radius.pill },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  map: { flex: 1, overflow: 'hidden', backgroundColor: colors.mapPlaceholder },
  alert: {
    position: 'absolute',
    left: spacing.sm,
    right: 72,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#C81E32',
  },
  tools: { position: 'absolute', right: spacing.sm, top: spacing.sm, gap: spacing.xs + 2 },
  tool: {
    width: 58,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: alpha(colors.surface, 0.94),
  },
  zoom: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.md,
    width: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: alpha(colors.surface, 0.94),
    overflow: 'hidden',
  },
  zoomBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  panelWrap: { position: 'absolute', right: 72, top: spacing.sm },
  notice: {
    position: 'absolute',
    left: spacing.sm,
    right: 72,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: alpha(colors.bg, 0.9),
    borderWidth: 1,
    borderColor: alpha(colors.warning, 0.5),
  },
  selection: { position: 'absolute', left: spacing.sm, right: 64, bottom: spacing.sm },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: -16,
    overflow: 'hidden',
  },
  grabberHit: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: 4 },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.xs },
  tab: { flex: 1, alignItems: 'center', gap: 6, paddingTop: 4, minHeight: 36 },
  tabLine: { height: 3, alignSelf: 'stretch', marginHorizontal: spacing.sm, borderRadius: 2, backgroundColor: 'transparent' },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 1,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, maxWidth: 170 },
  fav: { justifyContent: 'center', paddingHorizontal: 4 },
  route: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: alpha(colors.primary, 0.1),
  },
}));
