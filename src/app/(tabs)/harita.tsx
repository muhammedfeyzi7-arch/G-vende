import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { TopTabs } from '@/components/TopTabs';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { computeAlertState } from '@/features/earthquakes/alertState';
import { AlertCard } from '@/features/earthquakes/components/AlertCard';
import { EventInfoRow } from '@/features/earthquakes/components/EventInfoRow';
import { QuakeSummaryCard } from '@/features/earthquakes/components/QuakeSummaryCard';
import { useFamily } from '@/features/family/useFamily';
import { AssemblyTab, DetailsTab, HelpTab, LiveFeedTab, OfficialDataTab } from '@/features/home/tabs';
import { LayerPanel, MapControls, MapLegend, NearbyAssemblyButton, type MapFilters } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap, type FamilyPin, type MapSelection, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { SelectionCard } from '@/features/map/SelectionCard';
import type { ReportFilter } from '@/features/reports/components/CategoryChips';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, font, radius, spacing } from '@/theme';
import { distanceKm } from '@/utils/geo';

type TabKey = 'feed' | 'official' | 'assembly' | 'help' | 'details';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'feed', label: 'Canlı Akış' },
  { key: 'official', label: 'Resmî Veriler' },
  { key: 'assembly', label: 'Toplanma Alanları' },
  { key: 'help', label: 'Yardım' },
  { key: 'details', label: 'Detaylar' },
];

/**
 * Harita sekmesi: büyük etkileşimli harita, altında seçili depremin özeti ve
 * Canlı Akış / Resmî Veriler / Toplanma Alanları / Yardım / Detaylar panelleri.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height } = useWindowDimensions();
  const { focus: focusParam } = useLocalSearchParams<{ focus?: string }>();
  const { quakes, refreshQuakes, userCoords, location, settings, online } = useApp();
  const events = useVisibleQuakes();
  const feed = useReports();
  const nearby = useNearbyAssembly(userCoords, 10);
  const family = useFamily();
  const mapRef = useRef<QuakeMapHandle>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({ hours: 24, minMag: 0 });
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [tab, setTab] = useState<TabKey>('feed');
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const shown = useMemo(
    () =>
      events.filter(
        (e) => Date.now() - Date.parse(e.primary.occurredAt) <= filters.hours * 3600_000 && (e.primary.magnitude ?? 0) >= filters.minMag,
      ),
    [events, filters],
  );
  const alert = useMemo(() => computeAlertState(events, userCoords), [events, userCoords]);
  const focus = useMemo(
    () => events.find((e) => e.id === focusParam) ?? (alert.kind === 'none' ? null : alert.event),
    [events, focusParam, alert],
  );
  const mapEvents = useMemo(() => (focus && !shown.some((e) => e.id === focus.id) ? [focus, ...shown] : shown), [shown, focus]);
  const shownReports = useMemo(
    () => (filter === 'all' ? feed.reports : feed.reports.filter((r) => r.category === filter)),
    [feed.reports, filter],
  );

  // Seçili depremden sonra 150 km içinde paylaşılan (doğrulanmamış) kullanıcı bildirimi sayısı
  const feltReports = useMemo(() => {
    if (!focus) return 0;
    const t = Date.parse(focus.primary.occurredAt);
    return feed.reports.filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        Date.parse(r.createdAt) >= t &&
        distanceKm(focus.primary, { latitude: r.latitude, longitude: r.longitude }) <= 150,
    ).length;
  }, [focus, feed.reports]);

  // Aile üyelerinin izinli son konumları (yalnızca çevrimiçi grup; 30 dk'dan eskisi "eski").
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

  const mapHeight = Math.max(320, Math.min(520, height * 0.5));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshQuakes(), feed.refresh(), nearby.reload(), family.reload()]);
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        stickyHeaderIndices={[3]}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      >
        {/* 0: Uyarı kartı ve bilgi satırı */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <AlertCard
            state={alert}
            loading={quakes.loading}
            error={quakes.error}
            onPress={focus ? () => router.push({ pathname: '/deprem/[id]', params: { id: focus.id } }) : undefined}
          />
          {focus ? (
            <EventInfoRow event={focus} user={userCoords} locationHint={location.status === 'manual' ? location.label : undefined} />
          ) : (
            <View style={{ height: spacing.md }} />
          )}
        </View>

        {/* 1: Harita */}
        <View style={[styles.map, { height: mapHeight }]}>
          <QuakeMap
            ref={mapRef}
            mapStyle={settings.mapStyle}
            events={mapEvents}
            focus={focus}
            reports={shownReports}
            assemblyPoints={nearby.points}
            family={familyPins}
            user={userCoords}
            userIsPrecise={location.status === 'granted'}
            layers={layers}
            scaleBar
            onSelect={(s) => {
              setLayersOpen(false);
              setSelection(s);
            }}
            bottomInset={84}
          />
          <MapControls
            layersOpen={layersOpen}
            onLayers={() => setLayersOpen((v) => !v)}
            onLocate={() =>
              userCoords ? mapRef.current?.flyTo(userCoords, location.status === 'granted' ? 11 : 8) : router.push('/konum')
            }
            onFullscreen={() => router.push({ pathname: '/harita-tam', params: focus ? { focus: focus.id } : {} })}
          />
          {layersOpen ? <LayerPanel layers={layers} onChange={setLayers} filters={filters} onFilters={setFilters} /> : null}
          <View style={styles.mapBottom} pointerEvents="box-none">
            {selection ? (
              <View style={{ flex: 1 }}>
                <SelectionCard
                  selection={selection}
                  events={events}
                  reports={feed.reports}
                  assembly={nearby.points}
                  user={userCoords}
                  onClose={() => setSelection(null)}
                />
              </View>
            ) : (
              <>
                <MapLegend />
                <NearbyAssemblyButton
                  mine={nearby.myPoint?.name ?? null}
                  count={nearby.state.status === 'ready' ? nearby.state.points.length : nearby.state.status === 'not-configured' ? 0 : null}
                  onPress={() => router.push('/toplanma')}
                />
              </>
            )}
          </View>
        </View>

        {/* 2: Deprem özeti */}
        <View style={styles.sheetTop}>
          <View style={styles.grabber} />
          {focus ? (
            <QuakeSummaryCard event={focus} user={userCoords} feltReports={feltReports} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="pulse-outline" size={22} color={colors.textMuted} />
              <AppText variant="label" style={{ flex: 1 }}>
                {quakes.loading ? 'Deprem verileri yükleniyor…' : (quakes.error ?? 'Seçili dönemde gösterilecek deprem yok.')}
              </AppText>
            </View>
          )}
        </View>

        {/* 3: Yapışkan sekmeler */}
        <View style={{ backgroundColor: colors.bg }}>
          <TopTabs tabs={TABS} value={tab} onChange={setTab} />
        </View>

        {/* 4: Sekme içeriği */}
        <View>
          {tab === 'feed' ? (
            <LiveFeedTab
              filter={filter}
              onFilter={setFilter}
              reports={feed.reports}
              status={feed.status}
              error={feed.error}
              lastSyncedAt={feed.lastSyncedAt}
              pending={feed.pending}
              helpful={feed.helpful}
              onHelpful={(id) => {
                const r = feed.reports.find((x) => x.id === id);
                if (!r || r.isSample) return;
                feed.toggleHelpful(id).catch((e: Error) => Alert.alert('İşlem yapılamadı', e.message));
              }}
              onRetry={feed.refresh}
              online={online}
            />
          ) : tab === 'official' ? (
            <OfficialDataTab snapshot={quakes.snapshot} events={shown} user={userCoords} loading={quakes.loading} onRetry={refreshQuakes} />
          ) : tab === 'assembly' ? (
            <AssemblyTab
              state={nearby.state}
              myPoint={nearby.myPoint}
              onRetry={nearby.reload}
              onShowAll={() => router.push('/toplanma')}
              needsLocation={() => router.push('/konum')}
            />
          ) : tab === 'help' ? (
            <HelpTab
              helpReports={feed.reports.filter((r) => r.category === 'help')}
              onOpenReport={(r) => !r.isSample && router.push({ pathname: '/rapor/[id]', params: { id: r.id } })}
            />
          ) : (
            <DetailsTab event={focus} snapshot={quakes.snapshot} user={userCoords} />
          )}
        </View>
      </ScrollView>

      {tab === 'feed' ? (
        <Pressable
          onPress={() => router.push('/rapor/yeni')}
          accessibilityRole="button"
          accessibilityLabel="Bildirim ekle"
          style={({ pressed }) => [styles.fab, { bottom: tabBarHeight + spacing.md }, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="pencil" size={22} color="#fff" />
          <AppText variant="heading" color="#fff" style={{ fontSize: font.size.lg }}>
            Bildirim Ekle
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  map: {
    marginHorizontal: spacing.xs,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0A1824',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  mapBottom: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sheetTop: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginTop: spacing.sm },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    minHeight: 58,
    boxShadow: '0 8px 26px rgba(22,131,255,0.45)',
  },
});
