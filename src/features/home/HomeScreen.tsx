import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

const INFO_HEIGHT = 84;

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
  const { quakes, refreshQuakes, userCoords, location, online, settings } = useApp();
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
  const mapHeight = Math.max(260, Math.min(380, height * 0.36));

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
        stickyHeaderIndices={[3]}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      >
        {/* 0: Alarm kartı */}
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
          {location.status !== 'granted' && location.status !== 'manual' ? (
            <View style={{ marginTop: spacing.sm }}>
              <Banner
                icon="location-outline"
                text="Uzaklık ve yakın toplanma alanları için konumunuzu belirleyin."
                onPress={() => router.push('/konum')}
              />
            </View>
          ) : null}
        </View>

        {/* Harita: bilgi satırı üst kısma, lejant alt kısma gradyanla biner (referans düzeni) */}
        <View style={[styles.mapCard, { height: mapHeight + INFO_HEIGHT }]}>
          <QuakeMap
            mapStyle={settings.mapStyle}
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
            topInset={INFO_HEIGHT}
            bottomInset={72}
          />
          <LinearGradient
            pointerEvents="box-none"
            colors={[colors.bg, 'rgba(3,11,20,0.92)', 'rgba(3,11,20,0)']}
            locations={[0, 0.6, 1]}
            style={styles.topFade}
          >
            {focus ? (
              <EventInfoRow event={focus} user={userCoords} locationHint={location.status === 'manual' ? location.label : undefined} />
            ) : null}
          </LinearGradient>
          <LinearGradient pointerEvents="none" colors={['rgba(3,11,20,0)', 'rgba(3,11,20,0.75)']} style={styles.bottomFade} />
          <View style={[styles.controls, { top: INFO_HEIGHT - 8 }]} pointerEvents="box-none">
            <MapControls
              layersOpen={layersOpen}
              onLayers={() => setLayersOpen((v) => !v)}
              onLocate={onLocate}
              onFullscreen={() => router.push({ pathname: '/harita', params: focus ? { focus: focus.id } : {} })}
            />
            {layersOpen ? <LayerPanel layers={layers} onChange={setLayers} /> : null}
          </View>
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
        <View style={{ paddingHorizontal: spacing.md }}>
          <View style={styles.grabber} />
        </View>

        {/* 3: Yapışkan sekmeler (0: alarm, 1: harita, 2: tutamak) */}
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
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#0A1824',
  },
  topFade: { position: 'absolute', left: 0, right: 0, top: 0, height: INFO_HEIGHT + 36, paddingHorizontal: spacing.sm },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  controls: { position: 'absolute', left: 0, right: 0 },
  mapBottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
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
    minHeight: 58,
    boxShadow: '0 8px 26px rgba(22,131,255,0.45)',
  },
});
