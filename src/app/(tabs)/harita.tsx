import { router, useLocalSearchParams } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/ui';
import { useNearbyAssembly } from '@/features/assembly-points/useNearbyAssembly';
import { CategoryChips, type ReportFilter } from '@/features/reports/components/CategoryChips';
import { LayerPanel, MapControls, MapLegend } from '@/features/map/MapOverlays';
import { DEFAULT_LAYERS, QuakeMap, type MapSelection, type QuakeMapHandle } from '@/features/map/QuakeMap';
import { SelectionCard } from '@/features/map/SelectionCard';
import { useApp, useVisibleQuakes } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, radius, spacing } from '@/theme';

const PERIODS = [
  { key: 6, label: '6 sa' },
  { key: 24, label: '24 sa' },
  { key: 72, label: '3 gün' },
  { key: 168, label: '7 gün' },
] as const;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { focus: focusParam } = useLocalSearchParams<{ focus?: string }>();
  const { userCoords, location } = useApp();
  const events = useVisibleQuakes();
  const { reports } = useReports();
  const nearby = useNearbyAssembly(userCoords, 10);
  const mapRef = useRef<QuakeMapHandle>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [hours, setHours] = useState<number>(24);
  const [filter, setFilter] = useState<ReportFilter>('all');

  const shown = useMemo(() => events.filter((e) => Date.now() - Date.parse(e.primary.occurredAt) <= hours * 3600_000), [events, hours]);
  const focus = useMemo(() => events.find((e) => e.id === focusParam) ?? shown[0] ?? null, [events, shown, focusParam]);
  const shownReports = useMemo(() => (filter === 'all' ? reports : reports.filter((r) => r.category === filter)), [reports, filter]);

  return (
    <View style={styles.screen}>
      <QuakeMap
        ref={mapRef}
        events={shown}
        focus={focus}
        reports={shownReports}
        assemblyPoints={nearby.points}
        user={userCoords}
        userIsPrecise={location.status === 'granted'}
        layers={layers}
        onSelect={(s) => {
          setLayersOpen(false);
          setSelection(s);
        }}
        bottomInset={tabBarHeight}
      />
      <LinearGradient
        colors={[colors.bg, 'rgba(3,11,20,0.85)', 'rgba(3,11,20,0)']}
        locations={[0, 0.7, 1]}
        style={[styles.top, { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xl }]}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
        >
          {PERIODS.map((p) => {
            const active = hours === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setHours(p.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Son ${p.label} depremleri`}
                style={[styles.period, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <AppText variant="label" color={active ? '#fff' : colors.text}>
                  {p.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <CategoryChips value={filter} onChange={setFilter} />
      </LinearGradient>
      <View style={{ position: 'absolute', top: insets.top + 110, right: 0, left: 0 }} pointerEvents="box-none">
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
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: spacing.xs },
  period: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(7,21,34,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bottom: { position: 'absolute', left: spacing.md, right: spacing.md, gap: spacing.xs },
  count: {
    overflow: 'hidden',
    backgroundColor: 'rgba(3,11,20,0.8)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
