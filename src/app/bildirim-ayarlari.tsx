import { useState } from 'react';
import { AppText, Card } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup, Stepper, ToggleRow } from '@/components/ds';
import { Linking } from 'react-native';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { notifyLocally } from '@/services/localAlerts';
import { NotificationToggles } from '@/features/settings/NotificationToggles';
import { useApp } from '@/providers/AppProvider';
import { registerForPush } from '@/services/notifications';
import { colors, spacing } from '@/theme';

export default function NotificationSettings() {
  const { settings, updateSettings } = useApp();
  const [push, setPush] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);
  const perm = useNotificationPermission();
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
      <GroupTitle>Bu telefonda</GroupTitle>
      <RowGroup>
        <ToggleRow
          first
          icon="phone-portrait-outline"
          title="Telefona bildirim göster"
          subtitle={
            perm.status === 'denied'
              ? 'Bildirim izni kapalı — telefon ayarlarından açın'
              : 'Uygulama açıkken veya arka plandan dönünce yeni deprem kayıtları (sunucusuz)'
          }
          value={settings.localAlerts && perm.status === 'granted'}
          onChange={async (v) => {
            if (v && perm.status !== 'granted') {
              if (perm.status === 'denied') return Linking.openSettings();
              if (!(await perm.request())) return;
            }
            updateSettings({ localAlerts: v });
          }}
        />
        <ListRow
          icon="notifications-outline"
          title="Deneme bildirimi gönder"
          subtitle={test ?? 'Bildirimlerin bu telefonda göründüğünü kontrol edin'}
          onPress={async () => {
            if (perm.status !== 'granted' && !(await perm.request())) return setTest('Bildirim izni verilmedi.');
            const n = await notifyLocally([
              {
                id: `test:${Date.now()}`,
                kind: 'quake',
                title: 'GÜVENDE deneme bildirimi',
                body: 'Bu bir denemedir. Gerçek deprem kayıtları bu şekilde görünür.',
                at: new Date().toISOString(),
                read: true,
              },
            ]);
            setTest(n ? 'Gönderildi. Telefonunuzun bildirimlerine bakın.' : 'Bu cihazda gönderilemedi.');
          }}
        />
      </RowGroup>
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
          title="Uygulama kapalıyken de bildirim (push)"
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
