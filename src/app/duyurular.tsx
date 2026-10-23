import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Pill, StateMessage } from '@/components/ui';
import { GroupTitle, ListRow, RowGroup } from '@/components/ds';
import { formatDepth, formatMagnitude, magnitudeColor, placeTitle } from '@/features/earthquakes/format';
import { SOURCES } from '@/features/earthquakes/repository';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

/**
 * Resmî bilgiler: AFAD ve Kandilli'nin yayımladığı deprem kayıtları (M3+, son 7 gün) ve resmî
 * sitelere bağlantılar. Uygulama duyuru metni üretmez; yalnızca kaynak kaydını gösterir.
 */
export default function OfficialInfo() {
  const insets = useSafeAreaInsets();
  const { quakes, refreshQuakes } = useApp();
  const rows = useMemo(
    () =>
      (quakes.snapshot?.events ?? []).filter(
        (e) => (e.primary.magnitude ?? 0) >= 3 && e.readings.some((r) => r.source === 'afad' || r.source === 'kandilli'),
      ),
    [quakes.snapshot],
  );
  return (
    <FlatList
      data={rows}
      keyExtractor={(e) => e.id}
      refreshing={quakes.loading}
      onRefresh={refreshQuakes}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: insets.bottom + spacing.xl }}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
          <RowGroup>
            <ListRow
              first
              icon="globe-outline"
              title="AFAD resmî sitesi"
              subtitle="Duyurular ve açıklamalar"
              onPress={() => Linking.openURL('https://www.afad.gov.tr')}
            />
            <ListRow icon="pulse-outline" title="AFAD son depremler" onPress={() => Linking.openURL(SOURCES.afad.homepage)} />
            <ListRow icon="pulse-outline" title="Kandilli son depremler" onPress={() => Linking.openURL(SOURCES.kandilli.homepage)} />
          </RowGroup>
          <GroupTitle>Resmî deprem kayıtları (M3+)</GroupTitle>
          <AppText variant="caption">
            Son güncelleme: {quakes.snapshot?.lastSuccessAt ? formatDateTimeTr(quakes.snapshot.lastSuccessAt) : 'yok'}
            {quakes.snapshot?.stale ? ' · kaynaklara ulaşılamadı, önbellek gösteriliyor' : ''}
          </AppText>
        </View>
      }
      ListEmptyComponent={
        <StateMessage
          icon="radio-outline"
          title="Kayıt yok"
          message={quakes.error ?? 'Son 7 günde M3 ve üzeri resmî kayıt bulunmuyor.'}
          compact
        />
      }
      renderItem={({ item: e }) => {
        const src = e.readings.filter((r) => r.source !== 'usgs');
        const fresh = Date.now() - Date.parse(e.primary.occurredAt) < 60 * 60_000;
        return (
          <Pressable
            onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: e.id } })}
            accessibilityRole="button"
            style={styles.row}
          >
            <View style={[styles.mag, { borderColor: magnitudeColor(e.primary.magnitude) }]}>
              <AppText variant="heading" color={magnitudeColor(e.primary.magnitude)}>
                {formatMagnitude(e.primary.magnitude)}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {fresh ? <Pill label="Son Dakika" color={colors.danger} /> : null}
                {src.map((r) => (
                  <Pill key={r.source} label={SOURCES[r.source].label} color={colors.primary} />
                ))}
                <AppText variant="caption">{relativeTimeTr(e.primary.occurredAt)}</AppText>
              </View>
              <AppText variant="heading" style={{ fontSize: 13 }}>
                {placeTitle(e)}
              </AppText>
              <AppText variant="caption">Derinlik {formatDepth(e.primary.depthKm)}</AppText>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  mag: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
}));
