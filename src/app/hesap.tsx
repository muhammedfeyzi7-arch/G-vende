import { router } from 'expo-router';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { AppText, Button, Pill } from '@/components/ui';
import { Avatar, GroupTitle, IconTile, ListRow, Page, RowGroup, accent } from '@/components/ds';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { clearAll } from '@/services/storage';
import { friendlyError, getSupabase } from '@/services/supabase';
import { colors, radius, spacing, themedStyles } from '@/theme';

/** Hesap durumu. Uygulamada ücretli üyelik yoktur; tüm özellikler ücretsizdir. */
export default function AccountScreen() {
  const { session } = useApp();
  const { profile } = useProfile();
  const name = profile.name || session?.user.email?.split('@')[0] || 'Misafir';

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
      <View style={styles.head}>
        {session ? <Avatar name={name} uri={profile.photoUri} size={56} /> : <IconTile icon="person" color={accent.gray} size={56} solid />}
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title" style={{ fontSize: 18 }} numberOfLines={1}>
            {session ? name : 'Misafir kullanım'}
          </AppText>
          {session ? (
            <AppText variant="caption" numberOfLines={1}>
              {session.user.email}
            </AppText>
          ) : null}
          <Pill label={session ? 'Hesap bağlı' : 'Hesapsız'} color={session ? colors.safe : colors.textSecondary} />
        </View>
      </View>
      {!session && isBackendConfigured() ? <Button label="Giriş yap" icon="log-in-outline" onPress={() => router.push('/giris')} /> : null}
      <AppText variant="caption">
        GÜVENDE ücretsizdir; ücretli paket veya üyelik yoktur. Deprem verileri, harita, Acil Durum araçları, SMS ile aile bildirimi ve
        toplanma alanınız hesap olmadan çalışır.
        {isBackendConfigured()
          ? ' Hesap; herkese açık bildirim paylaşmak ve çevrimiçi aile grubu için gereklidir.'
          : ' Bu kurulumda sunucu bağlantısı olmadığı için hesap özellikleri kapalıdır.'}
      </AppText>
      {isBackendConfigured() && session ? (
        <>
          <GroupTitle>Hesap</GroupTitle>
          <RowGroup>
            <ListRow first icon="mail-outline" title="E-posta" value={session.user.email ?? ''} />
            <ListRow
              icon="download-outline"
              title="Verilerimi indir"
              subtitle="Sunucudaki verilerinizin kopyası (JSON)"
              onPress={exportData}
            />
            <ListRow icon="log-out-outline" title="Çıkış yap" onPress={() => getSupabase()?.auth.signOut()} />
            <ListRow icon="trash-outline" title="Hesabımı sil" danger onPress={deleteAccount} />
          </RowGroup>
        </>
      ) : null}
    </Page>
  );
}

const styles = themedStyles(() => ({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    boxShadow: colors.shadowSoft,
  },
}));
