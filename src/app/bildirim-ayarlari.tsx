import { useState } from 'react';
import { AppText, Card } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup, Stepper } from '@/components/ds';
import { NotificationToggles } from '@/features/settings/NotificationToggles';
import { useApp } from '@/providers/AppProvider';
import { registerForPush } from '@/services/notifications';
import { colors, spacing } from '@/theme';

export default function NotificationSettings() {
  const { settings, updateSettings } = useApp();
  const [push, setPush] = useState<string | null>(null);
  return (
    <Page>
      <Card style={{ gap: 4, borderColor: colors.dangerBorder }}>
        <AppText variant="label" color={colors.text}>
          GÜVENDE erken uyarı sistemi değildir
        </AppText>
        <AppText variant="caption">
          Bildirimler, deprem AFAD/Kandilli/USGS tarafından yayımlandıktan sonra gönderilir ve birkaç dakika gecikebilir. Sarsıntı
          başlamadan uyarı verilmez.
        </AppText>
      </Card>
      <NotificationToggles />
      <GroupTitle>Ayrıntılar</GroupTitle>
      <RowGroup>
        <Stepper
          first
          label="Deprem bildirimi için en küçük büyüklük"
          value={settings.minNotifyMagnitude}
          step={0.5}
          min={3}
          max={6}
          format={(v) => v.toFixed(1).replace('.', ',')}
          onChange={(v) => updateSettings({ minNotifyMagnitude: v })}
        />
        <Stepper
          label="Aynı bölge için en sık"
          value={settings.notifyIntervalMinutes}
          step={5}
          min={0}
          max={60}
          format={(v) => (v === 0 ? 'Her olay' : `${v} dk`)}
          onChange={(v) => updateSettings({ notifyIntervalMinutes: v })}
        />
        <ListRow
          icon="phone-portrait-outline"
          title="Bu cihazda push bildirimlerini etkinleştir"
          subtitle={push ?? 'Sunucu ve giriş gerektirir'}
          onPress={async () => {
            const r = await registerForPush();
            setPush(r.ok ? 'Bu cihaz için etkin.' : r.reason);
          }}
        />
      </RowGroup>
      <AppText variant="caption" style={{ marginHorizontal: spacing.xs }}>
        Uygulama açıkken eşleşen depremler Bildirim Merkezi’nde de listelenir; bu liste sunucu olmadan da çalışır.
      </AppText>
    </Page>
  );
}
