import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AppText, Banner, Button } from '@/components/ui';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { friendlyError, requireSupabase } from '@/services/supabase';
import { colors, radius, spacing } from '@/theme';

/** E-posta ile tek kullanımlık kod girişi (parola saklanmaz). */
export default function SignIn() {
  const { session } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  if (!isBackendConfigured()) return <Banner icon="server-outline" tone="warning" text="Sunucu yapılandırılmadığı için giriş yapılamaz." />;
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
      const { error } = await requireSupabase().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setStep('code');
    } catch (e) {
      Alert.alert('Kod gönderilemedi', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const { error } = await requireSupabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
      router.back();
    } catch (e) {
      Alert.alert('Doğrulanamadı', friendlyError(e));
    } finally {
      setBusy(false);
    }
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
            <Button label="Kod gönder" onPress={sendCode} loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} />
          </>
        ) : (
          <>
            <AppText variant="label">{email} adresine gönderilen kodu girin.</AppText>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Doğrulama kodu"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              style={styles.input}
              accessibilityLabel="Doğrulama kodu"
            />
            <Button label="Doğrula ve giriş yap" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
            <Button label="E-postayı değiştir" variant="ghost" onPress={() => setStep('email')} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
});
