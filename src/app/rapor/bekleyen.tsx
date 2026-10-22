import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, StateMessage } from '@/components/ui';
import { CATEGORY_META } from '@/features/reports/categories';
import { isRetryable } from '@/features/reports/pendingQueue';
import { useApp } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { colors, spacing } from '@/theme';
import { relativeTimeTr } from '@/utils/time';

export default function PendingReports() {
  const insets = useSafeAreaInsets();
  const { online } = useApp();
  const { pending, retryPending, discardPending } = useReports();
  if (pending.length === 0) return <StateMessage icon="checkmark-circle-outline" title="Bekleyen gönderi yok" />;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}>
      <AppText variant="label">Bu bildirimler henüz yayınlanmadı. Bağlantı geldiğinde otomatik olarak tekrar denenir.</AppText>
      {pending.map((p) => (
        <Card key={p.clientId} style={{ gap: 6 }}>
          <AppText variant="heading">{CATEGORY_META[p.category].formLabel}</AppText>
          {p.description ? <AppText variant="label" numberOfLines={2}>{p.description}</AppText> : null}
          <AppText variant="caption">
            Oluşturuldu {relativeTimeTr(p.createdAt)} · {p.attempts} deneme{p.photos.length ? ` · ${p.photos.length} fotoğraf` : ''}
          </AppText>
          {p.serverId ? <AppText variant="caption" color={colors.safe}>Bildirim yayınlandı; fotoğraflar bekliyor.</AppText> : null}
          {p.lastError ? <AppText variant="caption" color={isRetryable(p) ? colors.warning : colors.danger}>Son hata: {p.lastError}</AppText> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button label="Sil" variant="ghost" icon="trash-outline" onPress={() => discardPending(p.clientId)} />
          </View>
        </Card>
      ))}
      <Button label={online ? 'Şimdi tekrar dene' : 'Çevrimdışı'} icon="refresh" disabled={!online} onPress={retryPending} />
    </ScrollView>
  );
}
