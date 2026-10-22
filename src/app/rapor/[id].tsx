import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, Pill, StateMessage } from '@/components/ui';
import { FLAG_REASONS } from '@/features/reports/api';
import { CATEGORY_META, FELT_LEVELS, reportHeadline } from '@/features/reports/categories';
import { useApp } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, radius, spacing } from '@/theme';
import { distanceKm, formatDistance } from '@/utils/geo';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session, userCoords } = useApp();
  const { reports, helpful, toggleHelpful, flag } = useReports();
  const [flagged, setFlagged] = useState(false);
  const r = reports.find((x) => x.id === id);
  if (!r)
    return (
      <StateMessage
        icon="search-outline"
        title="Bildirim bulunamadı"
        message="Kaldırılmış, gizlenmiş veya 48 saatten eski olabilir."
        actionLabel="Geri dön"
        onAction={() => router.back()}
      />
    );

  const meta = CATEGORY_META[r.category];
  const ageH = (Date.now() - Date.parse(r.createdAt)) / 3600_000;

  const requireLogin = (fn: () => void) =>
    session
      ? fn()
      : Alert.alert('Giriş gerekli', 'Bu işlem için giriş yapın.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Giriş yap', onPress: () => router.push('/giris') },
        ]);

  const onFlag = () =>
    requireLogin(() =>
      Alert.alert('Bildirimi şikâyet et', 'Neden uygunsuz?', [
        ...FLAG_REASONS.map((f) => ({
          text: f.label,
          onPress: () =>
            flag(r.id, f.value)
              .then(() => {
                setFlagged(true);
                Alert.alert('Teşekkürler', 'Şikâyetiniz alındı. Birden fazla şikâyet alan bildirimler inceleme için gizlenir.');
              })
              .catch((e: Error) => Alert.alert('Gönderilemedi', e.message)),
        })),
        { text: 'Vazgeç', style: 'cancel' as const },
      ]),
    );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <View style={[styles.icon, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon} size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={meta.color}>
            {meta.label}
          </AppText>
          <AppText variant="title">{reportHeadline(r.category, r.feltIntensity)}</AppText>
        </View>
      </View>
      {ageH > 6 ? <Pill label={`${Math.floor(ageH)} saat önce paylaşıldı — güncel olmayabilir`} color={colors.warning} /> : null}
      {r.description ? <AppText variant="body">{r.description}</AppText> : null}
      {r.media.map((m) =>
        m.url ? (
          <Image key={m.id} source={{ uri: m.url }} style={styles.photo} contentFit="cover" accessibilityLabel="Bildirim fotoğrafı" />
        ) : (
          <Card key={m.id}>
            <AppText variant="label">Fotoğraf yüklenemedi.</AppText>
          </Card>
        ),
      )}
      <Card style={{ gap: 6 }}>
        <AppText variant="label">Bölge: {r.areaLabel ?? 'Belirtilmemiş'}</AppText>
        {r.feltIntensity ? (
          <AppText variant="label">Hissedilen: {FELT_LEVELS.find((l) => l.value === r.feltIntensity)?.label} (kişisel algı)</AppText>
        ) : null}
        <AppText variant="label">
          Paylaşıldı: {formatDateTimeTr(r.createdAt)} ({relativeTimeTr(r.createdAt)})
        </AppText>
        {userCoords && r.latitude != null && r.longitude != null ? (
          <AppText variant="label">
            Size uzaklık: ~{formatDistance(distanceKm(userCoords, { latitude: r.latitude, longitude: r.longitude }))}
          </AppText>
        ) : null}
        <AppText variant="label">
          Doğrulama:{' '}
          {r.verification === 'official'
            ? 'Yetkili tarafından doğrulandı'
            : r.verification === 'community'
              ? 'Topluluk teyitli'
              : 'Doğrulanmadı'}
        </AppText>
        <AppText variant="caption">Konum ~1 km hassasiyetle gösterilir.</AppText>
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon={helpful.has(r.id) ? 'heart' : 'heart-outline'}
          label={`Faydalı (${r.helpfulCount})`}
          onPress={() => requireLogin(() => toggleHelpful(r.id).catch((e: Error) => Alert.alert('Hata', e.message)))}
        />
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon="flag-outline"
          label={flagged ? 'Şikâyet edildi' : 'Şikâyet et'}
          disabled={flagged}
          onPress={onFlag}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surface },
});
