import { useToast } from '@/components/Toast';
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
import * as Location from 'expo-location';
import type { Vote } from '@/features/reports/api';
import { VERIFY_THRESHOLD, VOTE_RADIUS_M } from '@/features/trust/rules';
import { TrustBadge } from '@/features/trust/TrustBadge';
import { OfficialMatchChip } from '@/features/reports/components/OfficialMatchChip';
import { useTrust } from '@/features/trust/TrustProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { distanceKm, formatDistance } from '@/utils/geo';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session, userCoords } = useApp();
  const toast = useToast();
  const { reports, helpful, toggleHelpful, flag, votes, vote } = useReports();
  const { trust } = useTrust();
  const [flagged, setFlagged] = useState(false);
  const [voting, setVoting] = useState<Vote | null>(null);
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

  const myVote = votes.get(r.id);
  const canVote = r.verification !== 'official' && r.latitude != null && !r.isSample;
  const onVote = (v: Vote) =>
    requireLogin(async () => {
      if (!trust?.verified) {
        return Alert.alert('Kimlik doğrulaması gerekli', 'Oy verebilmek için kimliğinizi bir kez doğrulayın.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Doğrula', onPress: () => router.push('/kimlik') },
        ]);
      }
      const ask = () =>
        new Promise<boolean>((resolve) =>
          Alert.alert(
            v === 'confirm' ? 'Doğru, buradayım' : 'Yanlış ihbar',
            v === 'confirm'
              ? `Bu bildirimin yerinde olduğunuzu ve bilginin doğru olduğunu onaylıyorsunuz. Konumunuz yalnızca ${VOTE_RADIUS_M} m kuralı için kontrol edilir, kaydedilmez.`
              : `Bildirimin yanlış olduğunu bildiriyorsunuz. ${VERIFY_THRESHOLD} “yanlış ihbar” oyu alan bildirim kaldırılır ve yazarına yaptırım uygulanır. Emin değilseniz oy vermeyin.`,
            [
              { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Onayla', style: v === 'deny' ? 'destructive' : 'default', onPress: () => resolve(true) },
            ],
          ),
        );
      if (!(await ask())) return;
      setVoting(v);
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error('Oy vermek için konum izni gerekir (yakınlık kontrolü).');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await vote(r.id, v, { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 9999 });
        toast.show({ text: 'Oyunuz kaydedildi. Teşekkürler.' });
      } catch (e) {
        Alert.alert('Oy verilemedi', (e as Error).message);
      } finally {
        setVoting(null);
      }
    });

  const onFlag = () =>
    requireLogin(() =>
      Alert.alert('Bildirimi şikâyet et', 'Neden uygunsuz?', [
        ...FLAG_REASONS.map((f) => ({
          text: f.label,
          onPress: () =>
            flag(r.id, f.value)
              .then(() => {
                setFlagged(true);
                toast.show({ text: 'Şikâyetiniz alındı.', tone: 'info' });
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
        <AppText variant="caption">Konum ~1 km hassasiyetle gösterilir.</AppText>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <TrustBadge report={r} />
        <OfficialMatchChip report={r} detailed />
        <AppText variant="label">
          {r.verification === 'official'
            ? 'Kurumsal (resmî) hesap tarafından paylaşıldı.'
            : r.verification === 'community'
              ? `Yakındaki ${r.confirmCount} doğrulanmış kişi onayladı.`
              : `Henüz doğrulanmadı. ${VOTE_RADIUS_M} m yakınındaki ${VERIFY_THRESHOLD} doğrulanmış kişi onaylarsa “Topluluk Destekli” olur.`}
          {r.denyCount > 0 && r.verification !== 'official' ? ` ${r.denyCount} kişi yanlış olduğunu bildirdi.` : ''}
        </AppText>
        {canVote ? (
          myVote ? (
            <AppText variant="label" color={colors.primary}>
              Oyunuz: {myVote === 'confirm' ? 'Doğru, buradayım' : 'Yanlış ihbar'}
            </AppText>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                style={{ flex: 1 }}
                size="sm"
                icon="checkmark-circle-outline"
                label="Doğru, buradayım"
                loading={voting === 'confirm'}
                disabled={!!voting}
                onPress={() => onVote('confirm')}
              />
              <Button
                style={{ flex: 1 }}
                size="sm"
                variant="secondary"
                icon="close-circle-outline"
                label="Yanlış ihbar"
                loading={voting === 'deny'}
                disabled={!!voting}
                onPress={() => onVote('deny')}
              />
            </View>
          )
        ) : null}
        {canVote ? (
          <AppText variant="caption">Yalnızca kimliği doğrulanmış ve {VOTE_RADIUS_M} m yakınındaki kişilerin oyu kabul edilir.</AppText>
        ) : null}
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

const styles = themedStyles(() => ({
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surface },
}));
