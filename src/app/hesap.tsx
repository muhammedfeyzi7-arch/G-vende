import { router } from 'expo-router';
import { Alert, Share } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup, accent } from '@/components/ds';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { clearAll } from '@/services/storage';
import { friendlyError, getSupabase } from '@/services/supabase';
import { spacing } from '@/theme';

/** Hesap durumu. Uygulamada ücretli üyelik yoktur; tüm özellikler ücretsizdir. */
export default function AccountScreen() {
  const { session } = useApp();

  const exportData = async () => {
    const sb = getSupabase();
    if (!sb || !session) return;
    const { data, error } = await sb.rpc('export_my_data');
    if (error) return Alert.alert('Dışa aktarılamadı', friendlyError(error));
    await Share.share({ message: JSON.stringify(data, null, 2), title: 'GÜVENDE verilerim' });
  };

  const deleteAccount = () =>
    Alert.alert(
      'Hesabı sil',
      'Hesabınız, bildirimleriniz, aile üyelikleriniz ve durum kayıtlarınız kalıcı olarak silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı olarak sil',
          style: 'destructive',
          onPress: async () => {
            const sb = getSupabase();
            if (!sb) return;
            const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
            if (error) return Alert.alert('Silinemedi', friendlyError(error));
            await sb.auth.signOut();
            await clearAll();
            Alert.alert('Hesabınız silindi');
            router.back();
          },
        },
      ],
    );

  return (
    <Page>
      <Card style={{ gap: spacing.xs }}>
        <AppText variant="heading">{session ? 'Hesap bağlı' : 'Misafir kullanım'}</AppText>
        <AppText variant="label">
          GÜVENDE ücretsizdir; ücretli paket veya üyelik yoktur. Deprem verileri, harita, Acil Durum araçları, SMS ile aile bildirimi ve
          toplanma alanınız hesap olmadan çalışır.
          {isBackendConfigured()
            ? ' Hesap; herkese açık bildirim paylaşmak ve çevrimiçi aile grubu için gereklidir.'
            : ' Bu kurulumda sunucu bağlantısı olmadığı için hesap özellikleri kapalıdır.'}
        </AppText>
      </Card>
      {isBackendConfigured() ? (
        <>
          <GroupTitle>Hesap</GroupTitle>
          <RowGroup>
            {session ? (
              <>
                <ListRow first icon="mail-outline" title="E-posta" value={session.user.email ?? ''} />
                <ListRow
                  icon="download-outline"
                  title="Verilerimi indir"
                  subtitle="Sunucudaki verilerinizin kopyası (JSON)"
                  onPress={exportData}
                />
                <ListRow icon="log-out-outline" title="Çıkış yap" onPress={() => getSupabase()?.auth.signOut()} />
                <ListRow icon="trash-outline" title="Hesabımı sil" danger onPress={deleteAccount} />
              </>
            ) : (
              <ListRow
                first
                icon="log-in-outline"
                iconColor={accent.blue}
                title="Giriş yap"
                subtitle="E-posta ile tek kullanımlık kod"
                onPress={() => router.push('/giris')}
              />
            )}
          </RowGroup>
        </>
      ) : null}
    </Page>
  );
}
