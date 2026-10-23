import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button } from '@/components/ui';
import { accent } from '@/components/ds';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { computeAlertState } from '@/features/earthquakes/alertState';
import { AlertCard } from '@/features/earthquakes/components/AlertCard';
import { EventInfoRow } from '@/features/earthquakes/components/EventInfoRow';
import { QuakeListItem } from '@/features/earthquakes/components/QuakeListItem';
import { FamilySafetyCard } from '@/features/family/FamilySafetyCard';
import { useFamily } from '@/features/family/useFamily';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { buildPeople, safeCount } from '@/features/family/people';
import { LayerPanel, MapControls, MapLegend, NearbyAssemblyButton } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap, type MapSelection, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { SelectionCard } from '@/features/map/SelectionCard';
import { ReportCard } from '@/features/reports/components/ReportCard';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { relativeTimeTr } from '@/utils/time';
import { HomeHeader } from './HomeHeader';
import { QuickTiles } from './QuickTiles';

function SectionTitle({
  title,
  action,
  onAction,
  right,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="title" style={{ fontSize: 17.5, flex: 1 }}>
        {title}
      </AppText>
      {right}
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="link" style={{ padding: 4 }}>
          <AppText variant="label" color={colors.primary}>
            {action} ›
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height } = useWindowDimensions();
  const { quakes, refreshQuakes, userCoords, location, online, settings } = useApp();
  const events = useVisibleQuakes();
  const feed = useReports();
  const nearby = useNearbyAssembly(userCoords);
  const family = useFamily();
  const fam = useFamilyActions();

  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<QuakeMapHandle>(null);

  const alert = useMemo(() => computeAlertState(events, userCoords), [events, userCoords]);
  const focus = alert.kind === 'none' ? null : alert.event;
  // Haritada son 24 saatin olayları
  const mapEvents = useMemo(
    () => events.filter((e) => Date.now() - Date.parse(e.primary.occurredAt) < 24 * 3600_000 || e.id === focus?.id),
    [events, focus],
  );
  const mapHeight = Math.max(250, Math.min(340, height * 0.31));

  const groups =
    family.state.status === 'ready'
      ? family.state.groups
      : family.state.status === 'error' && family.state.cached
        ? family.state.cached.groups
        : [];
  const myUserId = family.state.status === 'ready' ? family.state.me : null;
  const familyCount = useMemo(
    () => safeCount(buildPeople({ name: '', status: fam.myStatus }, fam.contacts, groups, myUserId)),
    [fam.myStatus, fam.contacts, groups, myUserId],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshQuakes(), feed.refresh(), nearby.reload(), family.reload()]);
    setRefreshing(false);
  };

  const onLocate = () => {
    if (userCoords) mapRef.current?.flyTo(userCoords, location.status === 'granted' ? 11 : 8);
    else router.push('/konum');
  };

  const recentReports = feed.reports.slice(0, 10);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: tabBarHeight + spacing.xl, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      >
        <HomeHeader />
        {!online ? (
          <Banner
            icon="cloud-offline-outline"
            tone="warning"
            text="İnternet yok. Kayıtlı veriler gösteriliyor; Acil Durum araçları çalışır."
            onPress={() => router.push('/acil')}
          />
        ) : null}

        <AlertCard
          state={alert}
          loading={quakes.loading}
          error={quakes.error}
          onPress={focus ? () => router.push({ pathname: '/deprem/[id]', params: { id: focus.id } }) : undefined}
        />
        {focus ? (
          <View style={styles.infoCard}>
            <EventInfoRow event={focus} user={userCoords} locationHint={location.status === 'manual' ? location.label : undefined} />
          </View>
        ) : null}

        <View style={[styles.mapCard, { height: mapHeight }]}>
          <QuakeMap
            ref={mapRef}
            mapStyle={settings.mapStyle}
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
            bottomInset={72}
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
                  mine={nearby.myPoint?.name ?? null}
                  count={nearby.state.status === 'ready' ? nearby.state.points.length : nearby.state.status === 'not-configured' ? 0 : null}
                  onPress={() => router.push('/toplanma')}
                />
              </>
            )}
          </View>
        </View>

        <QuickTiles
          tiles={[
            {
              key: '112',
              icon: 'call',
              color: accent.red,
              title: '112',
              subtitle: 'Acil Çağrı',
              big: true,
              onPress: () => Linking.openURL('tel:112'),
            },
            {
              key: 'aile',
              icon: 'people',
              color: accent.blue,
              title: 'Ailem',
              subtitle: familyCount.total > 0 ? `${familyCount.safe}/${familyCount.total} güvende` : 'Kişi ekle',
              onPress: () => router.push('/ailem'),
            },
            { key: 'toplanma', icon: 'map', color: accent.green, title: 'Toplanma Alanları', onPress: () => router.push('/toplanma') },
            {
              key: 'canta',
              icon: 'mci:bag-personal',
              color: accent.orange,
              title: 'Acil Durum Çantası',
              onPress: () => router.push('/canta'),
            },
            { key: 'rehber', icon: 'document-text', color: accent.purple, title: 'Deprem Rehberi', onPress: () => router.push('/rehber') },
          ]}
        />

        <FamilySafetyCard groups={groups} myUserId={myUserId} />

        <View style={styles.block}>
          <SectionTitle
            title="Son Bildirimler"
            action="Tümünü Gör"
            onAction={() => router.push('/akis')}
            right={
              <Pressable
                onPress={() => router.push('/rapor/yeni')}
                accessibilityRole="button"
                accessibilityLabel="Bildirim ekle"
                style={styles.addBtn}
              >
                <AppText variant="label" color={colors.text}>
                  + Bildir
                </AppText>
              </Pressable>
            }
          />
          {recentReports.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
            >
              {recentReports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onPress={() => !r.isSample && router.push({ pathname: '/rapor/[id]', params: { id: r.id } })}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              <AppText variant="label">
                {feed.status === 'not-configured'
                  ? 'Topluluk bildirimleri sunucu bağlantısı gerektirir (bu kurulumda yok). Sahte kayıt gösterilmez.'
                  : feed.status === 'error'
                    ? `Bildirimler alınamadı. ${feed.error ?? ''}`
                    : 'Son 48 saatte paylaşılan bildirim yok.'}
              </AppText>
            </View>
          )}
          {recentReports.length ? (
            <AppText variant="caption" style={{ paddingHorizontal: spacing.lg }}>
              Kullanıcı bildirimleri doğrulanmamış olabilir; resmî kayıt değildir.
            </AppText>
          ) : null}
        </View>

        <View style={styles.block}>
          <SectionTitle title="Son Depremler" action="Tümünü Gör" onAction={() => router.push('/depremler')} />
          {events.length ? (
            events
              .slice(0, 5)
              .map((e) => (
                <QuakeListItem
                  key={e.id}
                  event={e}
                  user={userCoords}
                  onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: e.id } })}
                />
              ))
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              <AppText variant="label">{quakes.loading ? 'Yükleniyor…' : (quakes.error ?? 'Seçili eşiğin üzerinde kayıt yok.')}</AppText>
              {!quakes.loading ? <Button label="Tekrar dene" variant="secondary" icon="refresh" onPress={refreshQuakes} /> : null}
            </View>
          )}
          <AppText variant="caption" style={{ paddingHorizontal: spacing.lg }}>
            Kaynak: AFAD, Kandilli, USGS · Son güncelleme{' '}
            {quakes.snapshot?.lastSuccessAt ? relativeTimeTr(quakes.snapshot.lastSuccessAt) : 'yok'}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    boxShadow: colors.shadowSoft,
  },
  mapCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.mapPlaceholder,
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
  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    justifyContent: 'center',
  },
}));
