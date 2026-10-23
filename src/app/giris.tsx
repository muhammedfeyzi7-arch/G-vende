import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AppText, Button, StateMessage } from '@/components/ui';
import { parseAuthLink, signInWithAuthLink } from '@/features/auth/authLink';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { friendlyError, requireSupabase } from '@/services/supabase';
import { colors, radius, spacing, themedStyles } from '@/theme';

/**
 * E-posta ile parolasız giriş. Supabase'in varsayılan e-postası bir "Sign in" bağlantısı içerir:
 * telefonda dokunulunca uygulama açılır (AuthLinkHandler) ya da bağlantı kopyalanıp buraya yapıştırılır.
 * E-posta şablonu kod içerecek şekilde düzenlenmişse 6 haneli kod da kabul edilir.
 */
export default function SignIn() {
  const { session } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  if (!isBackendConfigured())
    return (
      <StateMessage
        icon="server-outline"
        title="Bu kurulumda hesap gerekmiyor"
        message="Sunucu bağlantısı yapılandırılmadığı için giriş yapılamaz. Deprem verileri, harita, Acil Durum araçları, SMS ile aile bildirimi ve kendi toplanma alanınız giriş olmadan çalışır."
        actionLabel="Geri dön"
        onAction={() => router.back()}
      />
    );
  if (session)
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <AppText variant="heading">Giriş yapıldı</AppText>
        <AppText variant="label">{session.user.email}</AppText>
        <Button label="Tamam" onPress={() => router.back()} />
      </ScrollView>
    );

  const sendCode = async () => {
    setBusy(true);
    try {
      const { error } = await requireSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('/giris') },
      });
      if (error) throw error;
      setStep('code');
    } catch (e) {
      Alert.alert('Kod gönderilemedi', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const verify = async (input = code) => {
    const value = input.trim();
    const link = parseAuthLink(value);
    if (!link && !/^\d{6,10}$/.test(value)) {
      Alert.alert('Tanınmadı', 'E-postadaki “Sign in” bağlantısını kopyalayıp yapıştırın.');
      return;
    }
    setBusy(true);
    try {
      const auth = requireSupabase().auth;
      if (link) await signInWithAuthLink(auth, link);
      else {
        const { error } = await auth.verifyOtp({ email: email.trim(), token: value, type: 'email' });
        if (error) throw error;
      }
      router.back();
    } catch (e) {
      Alert.alert('Giriş yapılamadı', `${friendlyError(e)}\n\nBağlantı tek kullanımlıktır; gerekirse yeni e-posta isteyin.`);
    } finally {
      setBusy(false);
    }
  };
  const pasteLink = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    setCode(text);
    if (text) verify(text);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <AppText variant="label">
          Bildirim paylaşmak ve aile ağını kullanmak için giriş gerekir. E-posta adresiniz diğer kullanıcılara gösterilmez.
        </AppText>
        {step === 'email' ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta adresi"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
              accessibilityLabel="E-posta adresi"
            />
            <Button label="Giriş bağlantısı gönder" onPress={sendCode} loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} />
          </>
        ) : (
          <>
            <AppText variant="heading" style={{ fontSize: 16 }}>
              E-postanızı kontrol edin
            </AppText>
            <AppText variant="label">
              {email} adresine “Your sign-in link” konulu bir e-posta gönderdik (gereksiz klasörüne de bakın).
            </AppText>
            <AppText variant="label">
              E-postadaki “Sign in” bağlantısına dokunmadan basılı tutun, “Bağlantıyı Kopyala” deyin ve aşağıdaki düğmeye basın.
            </AppText>
            <Button label="Kopyaladığım bağlantıyla giriş yap" icon="clipboard-outline" onPress={pasteLink} loading={busy} />
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="veya bağlantıyı / kodu buraya yapıştırın"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              style={styles.input}
              accessibilityLabel="Giriş bağlantısı veya kodu"
            />
            <Button label="Giriş yap" variant="secondary" onPress={() => verify()} loading={busy} disabled={code.trim().length < 6} />
            <Button label="Yeniden gönder" variant="ghost" onPress={sendCode} disabled={busy} />
            <Button label="E-postayı değiştir" variant="ghost" onPress={() => setStep('email')} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
}));
