import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, StateMessage } from '@/components/ui';
import { IconTile } from '@/components/ds';
import { CATEGORY_META } from '@/features/reports/categories';
import type { MyReport } from '@/features/reports/myReports';
import { VERIFY_THRESHOLD } from '@/features/trust/rules';
import { useReports } from '@/providers/ReportsProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { formatDateTimeTr, relativeTimeTr } from '@/utils/time';

function statusOf(m: MyReport): { label: string; color: string; icon: string; detail: string } {
  if (m.state === 'failed') return { label: 'Gönderilemedi', color: colors.danger, icon: 'close-circle', detail: m.error ?? '' };
  if (m.state === 'pending')
    return {
      label: 'Gönderim bekliyor',
      color: colors.warning,
      icon: 'time',
      detail: m.error ? `Son deneme: ${m.error}` : 'Bağlantı gelince otomatik gönderilir.',
    };
  if (m.missing)
    return { label: 'Yayında değil', color: colors.textMuted, icon: 'eye-off', detail: 'Kaldırıldı, incelemeye alındı veya süresi doldu.' };
  if (m.verification === 'official')
    return { label: 'Resmî', color: colors.primary, icon: 'checkmark-circle', detail: 'Kurumsal hesapla yayınlandı.' };
  if (m.verification === 'community')
    return {
      label: 'Doğrulanmış Bilgi',
      color: colors.safe,
      icon: 'shield-checkmark',
      detail: `${m.confirmCount ?? 0} yakın kişi onayladı.`,
    };
  return {
    label: 'Geçici Bilgi',
    color: colors.caution,
    icon: 'hourglass',
    detail: `${m.confirmCount ?? 0}/${VERIFY_THRESHOLD} onay${m.denyCount ? ` · ${m.denyCount} itiraz` : ''}`,
  };
}

/** Bu cihazdan gönderilen olay bildirimleri ve güncel durumları (yayında, doğrulandı, bekliyor…). */
export default function MyReports() {
  const insets = useSafeAreaInsets();
  const { mine, removeMine, discardPending, retryPending, pending } = useReports();

  if (!mine.length)
    return (
      <StateMessage
        icon="document-text-outline"
        title="Henüz olay bildirmediniz"
        message="Sarsıntı, hasar, yol kapanması veya yardım ihtiyacını bildirdiğinizde durumunu buradan takip edersiniz."
        actionLabel="Olay bildir"
        onAction={() => router.push('/rapor/yeni')}
      />
    );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: insets.bottom + spacing.xxl }}>
      {pending.length ? (
        <Button label={`Bekleyenleri şimdi gönder (${pending.length})`} icon="refresh" variant="secondary" onPress={retryPending} />
      ) : null}
      {mine.map((m) => {
        const meta = CATEGORY_META[m.category];
        const st = statusOf(m);
        return (
          <Pressable
            key={m.clientId}
            onPress={() =>
              m.serverId && m.state === 'sent' && !m.missing
                ? router.push({ pathname: '/rapor/[id]', params: { id: m.serverId } })
                : undefined
            }
            onLongPress={() =>
              Alert.alert('Kaydı kaldır', 'Bu kayıt yalnızca listenizden silinir; yayınlanmış bildirim etkilenmez.', [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Kaldır',
                  style: 'destructive',
                  onPress: () => (m.state === 'sent' ? removeMine(m.clientId) : discardPending(m.clientId)),
                },
              ])
            }
            accessibilityRole="button"
            accessibilityLabel={`${meta.formLabel}. ${st.label}. ${st.detail}. ${relativeTimeTr(m.createdAt)}`}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <IconTile icon={meta.icon} color={meta.color} size={42} solid />
            <View style={{ flex: 1, gap: 3 }}>
              <AppText variant="heading" style={{ fontSize: 14 }}>
                {meta.formLabel}
              </AppText>
              {m.description ? (
                <AppText variant="label" numberOfLines={2} style={{ fontSize: 12 }}>
                  {m.description}
                </AppText>
              ) : null}
              <AppText variant="caption">{[m.areaLabel, formatDateTimeTr(m.createdAt)].filter(Boolean).join(' · ')}</AppText>
              <View style={[styles.status, { borderColor: st.color + '88', backgroundColor: st.color + '1F' }]}>
                <Ionicons name={st.icon as never} size={13} color={st.color} />
                <AppText variant="caption" color={st.color} style={{ fontWeight: '700' }}>
                  {st.label}
                </AppText>
              </View>
              {st.detail ? <AppText variant="caption">{st.detail}</AppText> : null}
            </View>
          </Pressable>
        );
      })}
      <AppText variant="caption" style={{ textAlign: 'center', marginTop: spacing.sm }}>
        Kayıtlar yalnızca bu cihazda tutulur. Uzun basarak listeden kaldırabilirsiniz.
      </AppText>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
}));
