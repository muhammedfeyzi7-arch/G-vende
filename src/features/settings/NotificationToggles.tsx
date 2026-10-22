import { Alert, Linking, View } from 'react-native';
import { Banner } from '@/components/ui';
import { RowGroup, ToggleRow, accent } from '@/components/ds';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useApp } from '@/providers/AppProvider';
import { spacing } from '@/theme';

/**
 * Dört bildirim türü. Tercihler cihazda saklanır ve girişliyse sunucuya eşitlenir.
 * Not: Bu ayarlar yalnızca GÜVENDE bildirimlerini etkiler; operatörlerin resmî acil durum
 * yayınları (Cell Broadcast) işletim sistemi tarafından yönetilir ve buradan kapatılamaz.
 */
export function NotificationToggles() {
  const { settings, updateSettings } = useApp();
  const perm = useNotificationPermission();

  const toggleOfficial = (v: boolean) => {
    if (v) return updateSettings({ officialNotifications: true });
    Alert.alert(
      'Acil durum duyurularını kapat',
      'Türkiye genelindeki M5 ve üzeri depremler için GÜVENDE bildirimi almayacaksınız. Operatörlerin resmî acil durum yayınları bu ayardan etkilenmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kapat', style: 'destructive', onPress: () => updateSettings({ officialNotifications: false }) },
      ],
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {perm.status === 'denied' ? (
        <Banner
          icon="notifications-off-outline"
          tone="warning"
          text="Bildirim izni kapalı. Bildirim alabilmek için sistem ayarlarından izin verin."
          onPress={() => Linking.openSettings()}
        />
      ) : perm.status === 'undetermined' ? (
        <Banner icon="notifications-outline" text="Bildirimler için izin verin." onPress={perm.request} />
      ) : null}
      <RowGroup>
        <ToggleRow
          first
          icon="pulse"
          iconColor={accent.red}
          iconTile
          title="Deprem bildirimleri"
          subtitle={`Yakınınızdaki M${settings.minNotifyMagnitude.toFixed(1).replace('.', ',')}+ deprem kayıtları`}
          value={settings.quakeNotifications}
          onChange={(v) => updateSettings({ quakeNotifications: v })}
        />
        <ToggleRow
          icon="megaphone"
          iconColor={accent.red}
          iconTile
          title="Acil durum duyuruları"
          subtitle="AFAD ve resmî kaynaklarda yayımlanan M5+ depremler"
          value={settings.officialNotifications}
          onChange={toggleOfficial}
        />
        <ToggleRow
          icon="people"
          iconColor={accent.blue}
          iconTile
          title="Aile bildirimleri"
          subtitle="Aile üyelerinin durum değişiklikleri"
          value={settings.familyNotifications}
          onChange={(v) => updateSettings({ familyNotifications: v })}
        />
        <ToggleRow
          icon="chatbox-ellipses"
          iconColor={accent.orange}
          iconTile
          title="Topluluk bildirimleri"
          subtitle="Yakınınızdaki kullanıcıların paylaşımları"
          value={settings.communityNotifications}
          onChange={(v) => updateSettings({ communityNotifications: v })}
        />
      </RowGroup>
    </View>
  );
}
