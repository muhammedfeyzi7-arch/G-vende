import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import { GroupTitle, ListRow, Page, RowGroup, ToggleRow, accent } from '@/components/ds';
import { authenticate, biometricAvailability } from '@/features/settings/BiometricGate';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { friendlyError, getSupabase } from '@/services/supabase';
import { colors, radius, spacing } from '@/theme';

/**
 * Güvenlik. GÜVENDE parola kullanmaz: giriş, e-postaya gelen tek kullanımlık kodla yapılır;
 * bu yüzden "şifre değiştir" yerine e-posta değiştirme sunulur. Oturum belirteçleri
 * cihazın güvenli deposunda (Keychain / Keystore) tutulur.
 */
export default function SecurityScreen() {
  const { settings, updateSettings, session } = useApp();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleBiometric = async (v: boolean) => {
    if (!v) {
      if (await authenticate('Uygulama kilidini kapatmak için doğrulayın')) updateSettings({ biometricLock: false });
      return;
    }
    const a = await biometricAvailability();
    if (!a.ok) return Alert.alert('Biyometrik giriş kullanılamıyor', a.reason);
    if (await authenticate('Uygulama kilidini açmak için doğrulayın')) updateSettings({ biometricLock: true });
  };

  const changeEmail = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.updateUser({ email: email.trim() });
    setBusy(false);
    if (error) return Alert.alert('Değiştirilemedi', friendlyError(error));
    setEmail('');
    Alert.alert('Onay gönderildi', 'Yeni adresinize gelen bağlantıyla değişikliği onaylayın.');
  };

  const signOutOthers = () =>
    Alert.alert('Diğer cihazlardan çıkış', 'Bu cihaz dışındaki tüm oturumlarınız kapatılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          const { error } = (await getSupabase()?.auth.signOut({ scope: 'others' })) ?? { error: null };
          if (error) Alert.alert('İşlem yapılamadı', friendlyError(error));
          else Alert.alert('Tamam', 'Diğer cihazlardaki oturumlar kapatıldı.');
        },
      },
    ]);

  return (
    <Page keyboard>
      <GroupTitle>Uygulama kilidi</GroupTitle>
      <RowGroup>
        <ToggleRow
          first
          icon="finger-print"
          iconColor={accent.teal}
          iconTile
          title="Biyometrik giriş"
          subtitle="Açılışta Face ID / parmak izi iste"
          value={settings.biometricLock}
          onChange={toggleBiometric}
        />
      </RowGroup>
      <AppText variant="caption">
        Kilit ekranında 112 araması her zaman kullanılabilir. 5 dakikadan uzun arka planda kalınca tekrar sorulur.
      </AppText>

      <GroupTitle>Giriş ve şifre</GroupTitle>
      <Card style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.text}>
          Şifre kullanılmıyor
        </AppText>
        <AppText variant="caption">
          Giriş, e-postanıza gelen tek kullanımlık kodla yapılır; çalınabilecek veya unutulabilecek bir şifre saklanmaz.
        </AppText>
        {session ? (
          <>
            <AppText variant="label">Mevcut e-posta: {session.user.email}</AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Yeni e-posta adresi"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              accessibilityLabel="Yeni e-posta adresi"
            />
            <Button
              label="E-postayı değiştir"
              variant="secondary"
              loading={busy}
              disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
              onPress={changeEmail}
            />
          </>
        ) : isBackendConfigured() ? (
          <Button label="Giriş yap" variant="secondary" onPress={() => router.push('/giris')} />
        ) : null}
      </Card>

      <GroupTitle>Aktif cihazlar</GroupTitle>
      <RowGroup>
        <ListRow
          first
          icon="phone-portrait-outline"
          title={`${Device.modelName ?? 'Bu cihaz'} (bu cihaz)`}
          subtitle={`${Device.osName ?? ''} ${Device.osVersion ?? ''}`.trim() || undefined}
        />
        {session ? <ListRow icon="log-out-outline" title="Diğer tüm cihazlardan çıkış yap" danger onPress={signOutOthers} /> : null}
      </RowGroup>
      <AppText variant="caption">
        {session
          ? 'Sunucu, diğer oturumların ayrıntılı listesini sağlamaz; tümünü tek seferde kapatabilirsiniz.'
          : 'Hesap olmadan kullanıldığında oturum yoktur; veriler yalnızca bu cihazdadır.'}
      </AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
});
