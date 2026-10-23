import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, StateMessage } from '@/components/ui';
import { Icon } from '@/components/ds';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { QuakeListItem } from '@/features/earthquakes/components/QuakeListItem';
import { useFamily } from '@/features/family/useFamily';
import { LayerPanel, MapControls, MapLegend } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap, type FamilyPin, type MapSelection, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { SelectionCard } from '@/features/map/SelectionCard';
import { CategoryChips, type ReportFilter } from '@/features/reports/components/CategoryChips';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';

const PERIODS = [
  { key: 6, label: '6 sa' },
  { key: 24, label: '24 sa' },
  { key: 72, label: '3 gün' },
  { key: 168, label: '7 gün' },
] as const;
const MAGS = [0, 3, 4, 5] as const;

function Chip({ label, active, onPress, a11y }: { label: string; active: boolean; onPress: () => void; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={a11y}
      style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <AppText variant="label" color={active ? '#fff' : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Tam ekran harita: zaman/büyüklük filtreleri ve liste görünümü. */
export default function FullscreenMap() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom;
  const { focus: focusParam, toplanma, lat, lon } = useLocalSearchParams<{ focus?: string; toplanma?: string; lat?: string; lon?: string }>();
  const { userCoords, location, settings } = useApp();
  // Toplanma alanı listesinden "Haritada göster": harita o noktada açılır ve kartı seçili gelir.
  const target = useMemo(
    () => (toplanma && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) ? { latitude: Number(lat), longitude: Number(lon) } : null),
    [toplanma, lat, lon],
  );
  const events = useVisibleQuakes();
  const { reports } = useReports();
  const nearby = useNearbyAssembly(target ?? userCoords, 10);
  const family = useFamily();
  const mapRef = useRef<QuakeMapHandle>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(target ? { kind: 'assembly', id: toplanma! } : null);
  const [hours, setHours] = useState<number>(24);
  const [minMag, setMinMag] = useState<number>(0);
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [view, setView] = useState<'map' | 'list'>('map');

  const shown = useMemo(
    () => events.filter((e) => Date.now() - Date.parse(e.primary.occurredAt) <= hours * 3600_000 && (e.primary.magnitude ?? 0) >= minMag),
    [events, hours, minMag],
  );
  const focus = useMemo(
    () => (target ? null : (events.find((e) => e.id === focusParam) ?? shown[0] ?? null)),
    [target, events, shown, focusParam],
  );
  const shownReports = useMemo(() => (filter === 'all' ? reports : reports.filter((r) => r.category === filter)), [reports, filter]);

  // Aile üyelerinin izinli son konumları (yalnızca çevrimiçi grup; 30 dk'dan eskisi "eski" işaretlenir).
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
        })),
    );
  }, [family.state]);

  const header = (
    <LinearGradient
      colors={[colors.bg, alpha(colors.bg, 0.88), alpha(colors.bg, 0)]}
      locations={[0, 0.75, 1]}
      style={[
        styles.top,
        { paddingTop: insets.top + spacing.sm, paddingBottom: view === 'map' ? spacing.xl : spacing.sm },
        view === 'list' && { position: 'relative' },
      ]}
      pointerEvents="box-none"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Tam ekrandan çık" style={styles.close}>
          <Ionicons name="contract-outline" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1, fontSize: 19.5 }}>
          Harita
        </AppText>
        <View style={styles.segment} accessibilityRole="tablist">
          {(['map', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="tab"
              accessibilityLabel={v === 'map' ? 'Harita görünümü' : 'Liste'}
              accessibilityState={{ selected: view === v }}
              style={[styles.segBtn, view === v && styles.segOn]}
            >
              <Icon name={v === 'map' ? 'map-outline' : 'list-outline'} size={18} color={view === v ? '#fff' : colors.textSecondary} />
              <AppText variant="label" color={view === v ? '#fff' : colors.textSecondary}>
                {v === 'map' ? 'Harita' : 'Liste'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
      >
        {PERIODS.map((p) => (
          <Chip key={p.key} label={p.label} active={hours === p.key} onPress={() => setHours(p.key)} a11y={`Son ${p.label} depremleri`} />
        ))}
        <View style={{ width: 1, backgroundColor: colors.borderStrong, marginHorizontal: 2 }} />
        {MAGS.map((m) => (
          <Chip
            key={m}
            label={m ? `M${m}+` : 'Tüm M'}
            active={minMag === m}
            onPress={() => setMinMag(m)}
            a11y={m ? `Büyüklük ${m} ve üzeri` : 'Tüm büyüklükler'}
          />
        ))}
      </ScrollView>
      {view === 'map' ? <CategoryChips value={filter} onChange={setFilter} /> : null}
    </LinearGradient>
  );

  if (view === 'list') {
    return (
      <View style={styles.screen}>
        {header}
        <FlatList
          data={shown}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.xl }}
          ListEmptyComponent={
            <StateMessage icon="pulse-outline" title="Kayıt yok" message="Seçilen filtrelere uyan deprem bulunamadı." compact />
          }
          renderItem={({ item }) => (
            <QuakeListItem
              event={item}
              user={userCoords}
              onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: item.id } })}
            />
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <QuakeMap
        scaleBar
        mapStyle={settings.mapStyle}
        ref={mapRef}
        events={shown}
        focus={focus}
        initialCenter={target ?? undefined}
        initialZoom={target ? 16 : undefined}
        reports={shownReports}
        assemblyPoints={nearby.points}
        family={familyPins}
        user={userCoords}
        userIsPrecise={location.status === 'granted'}
        layers={layers}
        onSelect={(s) => {
          setLayersOpen(false);
          setSelection(s);
        }}
        bottomInset={tabBarHeight}
      />
      {header}
      <View style={{ position: 'absolute', top: insets.top + 150, right: 0, left: 0 }} pointerEvents="box-none">
        <MapControls
          layersOpen={layersOpen}
          onLayers={() => setLayersOpen((v) => !v)}
          onLocate={() => (userCoords ? mapRef.current?.flyTo(userCoords, location.status === 'granted' ? 12 : 8) : router.push('/konum'))}
        />
        {layersOpen ? <LayerPanel layers={layers} onChange={setLayers} /> : null}
      </View>
      <View style={[styles.bottom, { bottom: tabBarHeight + spacing.sm }]} pointerEvents="box-none">
        {selection ? (
          <SelectionCard
            selection={selection}
            events={events}
            reports={reports}
            assembly={nearby.points}
            user={userCoords}
            onClose={() => setSelection(null)}
          />
        ) : (
          <MapLegend />
        )}
        <AppText variant="caption" style={styles.count}>
          {shown.length} deprem · {shownReports.length} bildirim · {nearby.points.length} toplanma alanı
          {familyPins.length ? ` · ${familyPins.length} aile konumu` : ''}
        </AppText>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  close: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: spacing.sm, zIndex: 2 },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.mapPanel,
    paddingHorizontal: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.primary },
  bottom: { position: 'absolute', left: spacing.md, right: spacing.md, gap: spacing.xs },
  count: {
    overflow: 'hidden',
    backgroundColor: colors.mapPanel,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
}));
