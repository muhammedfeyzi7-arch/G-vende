import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Card, Pill, StateMessage } from '@/components/ui';
import { formatDepth, formatMagnitude, magnitudeColor, placeTitle } from '@/features/earthquakes/format';
import { SOURCES } from '@/features/earthquakes/repository';
import { DEFAULT_LAYERS, QuakeMap } from '@/features/map/QuakeMap';
import { ReportRow } from '@/features/reports/components/ReportRow';
import { useApp } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, radius, spacing } from '@/theme';
import { distanceKm, formatDistance } from '@/utils/geo';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

const REGION_KM = 150;

export default function EarthquakeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { quakes, userCoords, location } = useApp();
  const { reports, helpful, toggleHelpful } = useReports();
  const event = quakes.snapshot?.events.find((e) => e.id === id) ?? null;

  const regional = useMemo(() => {
    if (!event) return [];
    const t = Date.parse(event.primary.occurredAt);
    return reports.filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        Date.parse(r.createdAt) >= t &&
        distanceKm(event.primary, { latitude: r.latitude, longitude: r.longitude }) <= REGION_KM,
    );
  }, [event, reports]);

  if (!event) {
    return (
      <StateMessage
        icon="search-outline"
        title="Deprem bulunamadı"
        message={quakes.loading ? 'Veriler yükleniyor…' : 'Bu kayıt artık listede değil (7 günden eski olabilir).'}
        actionLabel="Geri dön"
        onAction={() => router.back()}
      />
    );
  }
  const p = event.primary;
  const c = magnitudeColor(p.magnitude);
  const mags = event.readings.map((r) => r.magnitude).filter((m): m is number => m != null);
  const spread = mags.length > 1 ? Math.max(...mags) - Math.min(...mags) : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
      <Stack.Screen options={{ title: placeTitle(event) }} />
      <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
        <View style={[styles.magBig, { borderColor: c, backgroundColor: c + '22' }]}>
          <AppText variant="display" color={c}>
            {formatMagnitude(p.magnitude)}
          </AppText>
          <AppText variant="caption" color={c}>
            {p.magnitudeType ?? 'tür bilinmiyor'}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title">{placeTitle(event)}</AppText>
          <AppText variant="label">{formatDateTimeTr(p.occurredAt)} TSİ</AppText>
          <AppText variant="caption">
            {relativeTimeTr(p.occurredAt)} · UTC {p.occurredAt.slice(0, 19).replace('T', ' ')}
          </AppText>
        </View>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Row label="Derinlik" value={formatDepth(p.depthKm)} />
        <Row label="Koordinat" value={`${p.latitude.toFixed(4)}° K, ${p.longitude.toFixed(4)}° D`} />
        <Row
          label="Size uzaklık"
          value={
            userCoords
              ? `${formatDistance(distanceKm(userCoords, p))}${location.status === 'manual' ? ' (il merkezine göre)' : ''}`
              : 'Konum bilinmiyor'
          }
        />
        <AppText variant="caption">
          Büyüklük depremin açığa çıkardığı enerjiyi ifade eder; bulunduğunuz yerde hissedilen şiddet değildir.
        </AppText>
      </Card>

      <View style={styles.mapBox}>
        <QuakeMap
          events={[event]}
          focus={event}
          reports={regional}
          assemblyPoints={[]}
          user={userCoords}
          userIsPrecise={location.status === 'granted'}
          layers={{ ...DEFAULT_LAYERS, assembly: false }}
          onSelect={() => {}}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Kaynaklara göre ölçümler</AppText>
        {spread >= 0.3 ? (
          <AppText variant="caption">
            Kaynaklar arasında {spread.toFixed(1)} birimlik büyüklük farkı var. Bu, farklı ölçüm yöntemlerinden kaynaklanabilir.
          </AppText>
        ) : null}
        {event.readings.map((r) => (
          <Card key={r.source} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppText variant="heading" style={{ flex: 1 }}>
                {SOURCES[r.source].label}
              </AppText>
              {r === event.primary ? <Pill label="Birincil" color={colors.primary} /> : null}
              <Pill
                label={
                  r.reviewStatus === 'reviewed' ? 'Revize' : r.reviewStatus === 'automatic' ? 'Otomatik / ilksel' : 'Durum belirtilmemiş'
                }
                color={r.reviewStatus === 'reviewed' ? colors.safe : colors.textMuted}
              />
            </View>
            <Row label="Büyüklük" value={`${formatMagnitude(r.magnitude)} ${r.magnitudeType ?? ''}`} />
            <Row label="Derinlik" value={formatDepth(r.depthKm)} />
            <Row label="Yer" value={r.place ?? 'Belirtilmemiş'} />
            <Row label="Kaynak güncellemesi" value={r.sourceUpdatedAt ? formatDateTimeTr(r.sourceUpdatedAt) : 'Kaynak belirtmiyor'} />
            <Row label="Uygulamaya alındı" value={formatDateTimeTr(r.fetchedAt)} />
            <AppText variant="caption">{SOURCES[r.source].attribution}</AppText>
            {r.url ? (
              <Pressable
                onPress={() => Linking.openURL(r.url!)}
                accessibilityRole="link"
                style={{ minHeight: 36, justifyContent: 'center' }}
              >
                <AppText variant="label" color={colors.primary}>
                  Kaynakta görüntüle ↗
                </AppText>
              </Pressable>
            ) : null}
          </Card>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Bölgesel kullanıcı bildirimleri ({regional.length})</AppText>
        <AppText variant="caption">
          Merkez üssüne {REGION_KM} km içinde, depremden sonra paylaşılan bildirimler. Doğrulanmamış olabilir.
        </AppText>
        {regional.length === 0 ? (
          <AppText variant="label">Bu deprem için bildirim yok.</AppText>
        ) : (
          <View style={{ marginHorizontal: -spacing.lg }}>
            {regional.slice(0, 20).map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                helpful={helpful.has(r.id)}
                onHelpful={() => !r.isSample && toggleHelpful(r.id).catch(() => {})}
                onPress={() => !r.isSample && router.push({ pathname: '/rapor/[id]', params: { id: r.id } })}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <AppText variant="label" style={{ width: 130 }}>
        {label}
      </AppText>
      <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  magBig: { width: 96, height: 96, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mapBox: { height: 240, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
});
