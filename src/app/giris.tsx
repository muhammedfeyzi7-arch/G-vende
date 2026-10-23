import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, StateMessage } from '@/components/ui';
import { IconTile, accent } from '@/components/ds';
import { appleErrorMessage, appleSignInAvailable, isAppleCancel, signInWithApple } from '@/features/auth/apple';
import { parseAuthLink, signInWithAuthLink } from '@/features/auth/authLink';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { friendlyError, requireSupabase } from '@/services/supabase';
import { colors, currentScheme, radius, spacing, themedStyles } from '@/theme';

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
  const [apple, setApple] = useState(false);
  useEffect(() => {
    appleSignInAvailable().then(setApple);
  }, []);

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
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
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

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  const appleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithApple(requireSupabase());
      router.back();
    } catch (e) {
      if (!isAppleCancel(e)) Alert.alert('Apple ile giriş yapılamadı', appleErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logo}>
            <LinearGradient colors={['#4D8DFF', '#1F5FE0']} style={StyleSheet.absoluteFill} />
            <Ionicons name={step === 'email' ? 'person' : 'mail-open'} size={34} color="#fff" />
          </View>
          <AppText variant="display" style={{ fontSize: 24, textAlign: 'center' }}>
            {step === 'email' ? 'Hesabınıza giriş yapın' : 'E-postanızı kontrol edin'}
          </AppText>
          <AppText variant="label" style={{ textAlign: 'center' }}>
            {step === 'email'
              ? apple
                ? 'Şifre yok: Apple hesabınızla ya da e-postanıza gelen tek kullanımlık bağlantıyla girin.'
                : 'Şifre yok: e-postanıza tek kullanımlık bir giriş bağlantısı göndeririz.'
              : `${email.trim()} adresine “Your sign-in link” konulu bir e-posta gönderdik.`}
          </AppText>
        </View>

        {step === 'email' ? (
          <>
            {apple ? (
              <>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={
                    currentScheme() === 'dark'
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={radius.md}
                  style={styles.apple}
                  onPress={() => (busy ? undefined : appleSignIn())}
                />
                <View style={styles.or}>
                  <View style={styles.line} />
                  <AppText variant="caption">veya e-posta ile</AppText>
                  <View style={styles.line} />
                </View>
              </>
            ) : null}
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@eposta.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => validEmail && sendCode()}
                style={styles.input}
                accessibilityLabel="E-posta adresi"
              />
            </View>
            <Button label="Giriş bağlantısı gönder" icon="paper-plane-outline" onPress={sendCode} loading={busy} disabled={!validEmail} />

            <View style={styles.benefits}>
              {[
                { icon: 'people', color: accent.blue, text: 'Çevrimiçi aile grubu ve “Güvendeyim” bildirimleri' },
                { icon: 'megaphone', color: accent.orange, text: 'Yakınınızdaki olayları bildirme ve doğrulama' },
                { icon: 'lock-closed', color: accent.green, text: 'E-postanız diğer kullanıcılara gösterilmez' },
              ].map((b) => (
                <View key={b.text} style={styles.benefit}>
                  <IconTile icon={b.icon} color={b.color} size={34} />
                  <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
                    {b.text}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              Deprem verileri, harita ve Acil Durum araçları giriş yapmadan da çalışır.
            </AppText>
          </>
        ) : (
          <>
            <View style={styles.steps}>
              {[
                'E-posta uygulamanızı açın (gelmediyse gereksiz klasörüne bakın).',
                '“Sign in” bağlantısına dokunmayın; basılı tutup “Bağlantıyı Kopyala” deyin.',
                'Buraya dönüp aşağıdaki düğmeye basın.',
              ].map((t, i) => (
                <View key={t} style={styles.step}>
                  <View style={styles.stepNo}>
                    <AppText variant="heading" color="#fff" style={{ fontSize: 13 }}>
                      {i + 1}
                    </AppText>
                  </View>
                  <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
                    {t}
                  </AppText>
                </View>
              ))}
            </View>
            <Button label="Kopyaladığım bağlantıyla giriş yap" icon="clipboard-outline" onPress={pasteLink} loading={busy} />
            <View style={styles.or}>
              <View style={styles.line} />
              <AppText variant="caption">veya elle yapıştırın</AppText>
              <View style={styles.line} />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Giriş bağlantısı veya kod"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={styles.input}
                accessibilityLabel="Giriş bağlantısı veya kodu"
              />
            </View>
            <Button label="Giriş yap" variant="secondary" onPress={() => verify()} loading={busy} disabled={code.trim().length < 6} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md }}>
              <Button label="Yeniden gönder" icon="refresh" variant="ghost" size="sm" onPress={sendCode} disabled={busy} />
              <Button label="E-postayı değiştir" icon="create-outline" variant="ghost" size="sm" onPress={() => setStep('email')} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xs },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 28px rgba(31,95,224,0.35)',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, minHeight: 46, color: colors.text, fontSize: 15 },
  benefits: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  steps: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  apple: { height: 48, width: '100%' },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
}));
