import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, StateMessage } from '@/components/ui';
import { QuakeListItem } from '@/features/earthquakes/components/QuakeListItem';
import { SourceHealthCard } from '@/features/home/tabs';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing } from '@/theme';
import { distanceKm } from '@/utils/geo';

const PERIODS = [
  { key: 1, label: '1 sa' },
  { key: 24, label: '24 sa' },
  { key: 72, label: '3 gün' },
  { key: 168, label: '7 gün' },
];
const MAGS = [2, 3, 4, 5];
const DISTANCES = [
  { key: 0, label: 'Tümü' },
  { key: 100, label: '100 km' },
  { key: 300, label: '300 km' },
];
type Sort = 'time' | 'mag' | 'dist';

function Chips<T extends number | string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" style={{ marginLeft: spacing.md }}>
        {label}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
      >
        {items.map((i) => (
          <Pressable
            key={String(i.key)}
            onPress={() => onChange(i.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === i.key }}
            accessibilityLabel={`${label}: ${i.label}`}
            style={[styles.chip, value === i.key && styles.chipOn]}
          >
            <AppText variant="label" color={value === i.key ? '#fff' : colors.text}>
              {i.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Deprem geçmişi: zaman, büyüklük ve mesafe filtreleri ile sıralama. */
export default function QuakeHistory() {
  const insets = useSafeAreaInsets();
  const { quakes, userCoords, refreshQuakes } = useApp();
  const [hours, setHours] = useState(24);
  const [minMag, setMinMag] = useState(2);
  const [maxDist, setMaxDist] = useState(0);
  const [sort, setSort] = useState<Sort>('time');

  const list = useMemo(() => {
    const now = Date.now();
    const rows = (quakes.snapshot?.events ?? [])
      .filter((e) => now - Date.parse(e.primary.occurredAt) <= hours * 3600_000)
      .filter((e) => (e.primary.magnitude ?? 0) >= minMag)
      .map((e) => ({ e, d: userCoords ? distanceKm(userCoords, e.primary) : null }))
      .filter((x) => !maxDist || (x.d != null && x.d <= maxDist));
    if (sort === 'mag') rows.sort((a, b) => (b.e.primary.magnitude ?? 0) - (a.e.primary.magnitude ?? 0));
    if (sort === 'dist') rows.sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity));
    return rows;
  }, [quakes.snapshot, hours, minMag, maxDist, sort, userCoords]);

  return (
    <FlatList
      data={list}
      keyExtractor={(x) => x.e.id}
      onRefresh={refreshQuakes}
      refreshing={quakes.loading}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, paddingVertical: spacing.md }}>
          <Chips label="Zaman" items={PERIODS} value={hours} onChange={setHours} />
          <Chips label="En küçük büyüklük" items={MAGS.map((m) => ({ key: m, label: `M${m}+` }))} value={minMag} onChange={setMinMag} />
          {userCoords ? <Chips label="Uzaklık" items={DISTANCES} value={maxDist} onChange={setMaxDist} /> : null}
          <Chips
            label="Sıralama"
            items={[
              { key: 'time' as Sort, label: 'En yeni' },
              { key: 'mag' as Sort, label: 'En büyük' },
              ...(userCoords ? [{ key: 'dist' as Sort, label: 'En yakın' }] : []),
            ]}
            value={sort}
            onChange={setSort}
          />
          <AppText variant="caption" style={{ marginLeft: spacing.md }}>
            {list.length} kayıt · Kaynaklarda son 7 gün sorgulanır
          </AppText>
        </View>
      }
      ListEmptyComponent={
        quakes.loading ? (
          <StateMessage icon="hourglass-outline" title="Yükleniyor…" compact />
        ) : (
          <StateMessage
            icon="pulse-outline"
            title="Kayıt yok"
            message={quakes.error ?? 'Seçilen filtrelere uyan deprem bulunamadı.'}
            compact
          />
        )
      }
      ListFooterComponent={
        <View style={{ padding: spacing.md }}>
          <SourceHealthCard snapshot={quakes.snapshot} onRetry={refreshQuakes} />
        </View>
      }
      renderItem={({ item }) => (
        <QuakeListItem
          event={item.e}
          user={userCoords}
          onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: item.e.id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
