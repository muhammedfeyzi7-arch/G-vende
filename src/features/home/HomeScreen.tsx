import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner } from '@/components/ui';
import { TopTabs } from '@/components/TopTabs';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { computeAlertState } from '@/features/earthquakes/alertState';
import { AlertCard } from '@/features/earthquakes/components/AlertCard';
import { EventInfoRow } from '@/features/earthquakes/components/EventInfoRow';
import { LayerPanel, MapControls, MapLegend, NearbyAssemblyButton } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap, type MapSelection, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { SelectionCard } from '@/features/map/SelectionCard';
import type { ReportFilter } from '@/features/reports/components/CategoryChips';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, font, radius, spacing } from '@/theme';
import { AssemblyTab, DetailsTab, HelpTab, LiveFeedTab, OfficialDataTab } from './tabs';

type TabKey = 'feed' | 'official' | 'assembly' | 'help' | 'details';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'feed', label: 'Canlı Akış' },
  { key: 'official', label: 'Resmî Veriler' },
  { key: 'assembly', label: 'Toplanma Alanları' },
  { key: 'help', label: 'Yardım' },
  { key: 'details', label: 'Detaylar' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height } = useWindowDimensions();
  const { quakes, refreshQuakes, userCoords, location, online } = useApp();
  const events = useVisibleQuakes();
  const feed = useReports();
  const nearby = useNearbyAssembly(userCoords);

  const [tab, setTab] = useState<TabKey>('feed');
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<QuakeMapHandle>(null);

  const alert = useMemo(() => computeAlertState(events, userCoords), [events, userCoords]);
  const focus = alert.kind === 'none' ? null : alert.event;
  // Haritada son 24 saatin olayları; liste sekmesinde tümü.
  const mapEvents = useMemo(
    () => events.filter((e) => Date.now() - Date.parse(e.primary.occurredAt) < 24 * 3600_000 || e.id === focus?.id),
    [events, focus],
  );
  const mapHeight = Math.max(280, Math.min(420, height * 0.4));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshQuakes(), feed.refresh(), nearby.reload()]);
    setRefreshing(false);
  };

  const onLocate = () => {
    if (userCoords) mapRef.current?.flyTo(userCoords, location.status === 'granted' ? 11 : 8);
    else router.push('/konum');
  };

  const onHelpful = (id: string) => {
    if (!feed.reports.find((r) => r.id === id) || feed.reports.find((r) => r.id === id)?.isSample) return;
    feed.toggleHelpful(id).catch((e: Error) => Alert.alert('İşlem yapılamadı', e.message));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      >
        {/* 0: Alarm kartı + bilgi satırı + harita */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          {!online ? (
            <View style={{ marginBottom: spacing.sm }}>
              <Banner
                icon="cloud-offline-outline"
                tone="warning"
                text="İnternet bağlantısı yok. Kayıtlı veriler gösteriliyor."
                onPress={() => router.push('/acil')}
              />
            </View>
          ) : null}
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
          {location.status !== 'granted' && location.status !== 'manual' ? (
            <View style={{ marginBottom: spacing.sm }}>
              <Banner
                icon="location-outline"
                text="Uzaklık ve yakın toplanma alanları için konumunuzu belirleyin."
                onPress={() => router.push('/konum')}
              />
            </View>
          ) : null}

          <View style={[styles.mapCard, { height: mapHeight }]}>
            <QuakeMap
              ref={mapRef}
              events={mapEvents}
              focus={focus}
              reports={feed.reports}
              assemblyPoints={nearby.points}
              user={userCoords}
              userIsPrecise={location.status === 'granted'}
              layers={layers}
              onSelect={(s) => {
                setLayersOpen(false);
                setSelection(s);
              }}
              bottomInset={64}
            />
            <MapControls
              layersOpen={layersOpen}
              onLayers={() => setLayersOpen((v) => !v)}
              onLocate={onLocate}
              onFullscreen={() => router.push({ pathname: '/harita', params: focus ? { focus: focus.id } : {} })}
            />
            {layersOpen ? <LayerPanel layers={layers} onChange={setLayers} /> : null}
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
                    count={
                      nearby.state.status === 'ready' ? nearby.state.points.length : nearby.state.status === 'not-configured' ? 0 : null
                    }
                    onPress={() => router.push('/toplanma')}
                  />
                </>
              )}
            </View>
          </View>
          <View style={styles.grabber} />
        </View>

        {/* 1: Yapışkan sekmeler */}
        <View style={{ backgroundColor: colors.bg }}>
          <TopTabs tabs={TABS} value={tab} onChange={setTab} />
        </View>

        {/* 2: Sekme içeriği */}
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
              onHelpful={onHelpful}
              onRetry={feed.refresh}
              online={online}
            />
          ) : tab === 'official' ? (
            <OfficialDataTab
              snapshot={quakes.snapshot}
              events={events}
              user={userCoords}
              loading={quakes.loading}
              onRetry={refreshQuakes}
            />
          ) : tab === 'assembly' ? (
            <AssemblyTab
              state={nearby.state}
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

      {tab === 'feed' || tab === 'help' ? (
        <Pressable
          onPress={() => router.push('/rapor/yeni')}
          accessibilityRole="button"
          accessibilityLabel="Bildirim ekle"
          style={({ pressed }) => [
            styles.fab,
            { bottom: tabBarHeight + spacing.md },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
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
  mapCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginVertical: spacing.sm },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
