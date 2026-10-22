import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { AppText, Banner, Button, Card } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup, ToggleRow, accent } from '@/components/ds';
import { loadContacts } from '@/features/family/local';
import { useApp } from '@/providers/AppProvider';
import { clearAll } from '@/services/storage';
import { getSupabase } from '@/services/supabase';
import { colors, spacing } from '@/theme';
import { relativeTimeTr } from '@/utils/time';

/** Konum paylaşımı ve gizlilik ayarları. */
export default function PrivacyScreen() {
  const { settings, updateSettings, location, session } = useApp();
  const [contactCount, setContactCount] = useState(0);
  useEffect(() => {
    loadContacts().then((c) => setContactCount(c.length));
  }, []);

  const stopSharing = async () => {
    updateSettings({ locationSharing: false });
    // Çevrimiçi aile gruplarında da paylaşımı kapat (sunucu tarafı tetikleyici konumu atar).
    const sb = getSupabase();
    if (sb && session) await sb.from('family_members').update({ share_location: false }).eq('user_id', session.user.id);
  };

  const toggleSharing = (v: boolean) => {
    if (!v) return stopSharing();
    Alert.alert(
      'Konum paylaşımını aç',
      'Açıkken “Güvendeyim / Yardım lazım” mesajlarına ve aile grubu durum bildirimlerinize o anki konumunuz (~100 m) eklenir. Sürekli takip yapılmaz, arka planda konum toplanmaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Aç', onPress: () => updateSettings({ locationSharing: true }) },
      ],
    );
  };

  const permLabel =
    location.status === 'granted'
      ? `İzin verildi · son okuma ${relativeTimeTr(location.at)}`
      : location.status === 'manual'
        ? `İzin yok · elle seçilen: ${location.label}`
        : location.status === 'denied'
          ? 'İzin verilmedi'
          : location.status === 'unavailable'
            ? 'Konum alınamıyor'
            : 'Henüz sorulmadı';

  return (
    <Page>
      <GroupTitle>Konum paylaşımı</GroupTitle>
      <RowGroup>
        <ToggleRow
          first
          icon="navigate-outline"
          iconColor={accent.green}
          iconTile
          title="Konumumu ailemle paylaş"
          subtitle="Yalnızca durum bildirirken"
          value={settings.locationSharing}
          onChange={toggleSharing}
        />
        <ListRow
          icon="people-outline"
          title="Kimlerle paylaşılır?"
          subtitle={`${contactCount} acil durum kişisi (SMS)${session ? ' ve çevrimiçi aile grubunuz' : ''}`}
          onPress={() => router.push('/ailem')}
        />
        <ListRow
          icon="eye-off-outline"
          title="Konumumu gizle"
          subtitle="Belirli kişilere konum gönderme"
          value={settings.hideLocationFrom.length ? `${settings.hideLocationFrom.length} kişi` : 'Yok'}
          onPress={() => router.push('/gizlilik/gizle')}
        />
      </RowGroup>
      {settings.locationSharing ? (
        <Button label="Konum paylaşımını durdur" icon="stop-circle-outline" variant="danger" onPress={stopSharing} />
      ) : null}

      <GroupTitle>Konum izni</GroupTitle>
      <RowGroup>
        <ListRow first icon="location-outline" title="Cihaz konumu" subtitle={permLabel} onPress={() => router.push('/konum')} />
        <ListRow
          icon="settings-outline"
          title="Sistem izinleri"
          subtitle="Konum, kamera, fotoğraf, rehber, bildirim"
          onPress={() => Linking.openSettings()}
        />
      </RowGroup>
      <Card style={{ gap: 4 }}>
        <AppText variant="label" color={colors.text}>
          Arka plan konumu kullanılmaz
        </AppText>
        <AppText variant="caption">
          GÜVENDE konumu yalnızca uygulama açıkken ve bir işlem için okur. Kayıtlı konum eskiyse “son okuma” zamanıyla gösterilir; canlı
          konum gibi sunulmaz.
        </AppText>
      </Card>

      <GroupTitle>Paylaşım ve veriler</GroupTitle>
      <RowGroup>
        <ToggleRow
          first
          icon="megaphone-outline"
          title="Bildirimlere yaklaşık konum ekle"
          subtitle="Herkese açık bildirimlerde ~1 km"
          value={settings.attachLocationByDefault}
          onChange={(v) => updateSettings({ attachLocationByDefault: v })}
        />
        <ToggleRow
          icon="cloud-offline-outline"
          title="Aile bilgilerini çevrimdışı sakla"
          subtitle="Çevrimiçi grup bilgisi bu cihazda tutulur"
          value={settings.cacheFamilyOffline}
          onChange={(v) => updateSettings({ cacheFamilyOffline: v })}
        />
        {session ? <ListRow icon="download-outline" title="Verilerimi indir" onPress={() => router.push('/hesap')} /> : null}
        <ListRow
          icon="trash-bin-outline"
          title="Bu cihazdaki tüm verileri sil"
          subtitle="Ayarlar, kişiler, profil, kayıtlı alanlar, önbellek"
          danger
          onPress={() =>
            Alert.alert('Yerel verileri sil', 'Bu cihazdaki tüm GÜVENDE verileri silinecek. Sunucudaki hesabınız etkilenmez.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await clearAll();
                  Alert.alert('Silindi', 'Değişikliklerin tümüyle uygulanması için uygulamayı yeniden başlatın.');
                },
              },
            ])
          }
        />
      </RowGroup>
      {!settings.locationSharing ? (
        <Banner icon="shield-checkmark-outline" text="Konum paylaşımı kapalı: hiçbir mesaja veya aile bildirimine konum eklenmez." />
      ) : null}
    </Page>
  );
}
