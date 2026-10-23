import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Banner, Button } from '@/components/ui';
import { GroupTitle, Page } from '@/components/ds';
import { verifyIdentity } from '@/features/trust/api';
import { isInstitution, isSuspended } from '@/features/trust/rules';
import { isValidBirthYear, isValidTckn } from '@/features/trust/tckn';
import { useTrust } from '@/features/trust/TrustProvider';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { formatDateTimeTr } from '@/utils/time';

/**
 * Kimlik doğrulama: NVİ (Nüfus ve Vatandaşlık İşleri) servisiyle T.C. kimlik no + ad + soyad + doğum yılı
 * eşleşmesi. Bilgiler yalnızca sunucu işlevine iletilir; cihazda ve veritabanında saklanmaz.
 */
export default function IdentityScreen() {
  const { session } = useApp();
  const { trust, refresh } = useTrust();
  const [tckn, setTckn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [year, setYear] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const backend = isBackendConfigured();
  const tcOk = isValidTckn(tckn);
  const yearOk = isValidBirthYear(Number(year));
  const ready = backend && !!session && tcOk && firstName.trim() && lastName.trim() && yearOk && consent;

  const submit = async () => {
    setBusy(true);
    try {
      await verifyIdentity({ tckn, firstName, lastName, birthYear: Number(year), consent });
      setTckn('');
      await refresh();
      Alert.alert('Kimliğiniz doğrulandı', 'Artık haritaya bildirim ekleyebilir ve yakınınızdaki bildirimleri oylayabilirsiniz.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Doğrulanamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (trust?.verified) {
    return (
      <Page>
        <View style={styles.done}>
          <Ionicons name={isInstitution(trust) ? 'checkmark-circle' : 'shield-checkmark'} size={56} color={colors.safe} />
          <AppText variant="title">{isInstitution(trust) ? `Kurumsal hesap · ${trust.orgName ?? ''}` : 'Kimliğiniz doğrulandı'}</AppText>
          <AppText variant="label" style={{ textAlign: 'center' }}>
            Bildirimleriniz {isInstitution(trust) ? '“Resmî” rozetiyle' : 'önce “Geçici Bilgi” olarak'} yayınlanır. Kimlik bilgileriniz
            saklanmaz; yalnızca doğrulama yapıldığı kaydedilir.
          </AppText>
        </View>
        {trust.strikes > 0 ? (
          <Banner
            icon="warning-outline"
            tone="warning"
            text={`${trust.strikes} yanlış ihbar kaydınız var.${isSuspended(trust) ? ` Bildirim yasağı: ${formatDateTimeTr(trust.suspendedUntil!)} tarihine kadar.` : ''}`}
          />
        ) : null}
      </Page>
    );
  }

  return (
    <Page keyboard>
      {!backend ? (
        <Banner icon="server-outline" tone="warning" text="Kimlik doğrulama için sunucu bağlantısı gerekir (bu kurulumda yok)." />
      ) : !session ? (
        <Banner icon="person-circle-outline" tone="warning" text="Önce giriş yapın." onPress={() => router.push('/giris')} />
      ) : null}

      <AppText variant="label">
        Haritaya bildirim ekleyebilmek ve başkalarının bildirimlerini oylayabilmek için kimliğinizi bir kez doğrulamanız gerekir. Böylece
        sahte ihbar yapan kişi anonim kalamaz; her kimlik yalnızca bir hesapta kullanılabilir.
      </AppText>

      <GroupTitle>Kimlik bilgileri</GroupTitle>
      <View style={{ gap: spacing.sm }}>
        <TextInput
          value={tckn}
          onChangeText={(t) => setTckn(t.replace(/\D/g, '').slice(0, 11))}
          placeholder="T.C. kimlik numarası"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={11}
          secureTextEntry
          autoComplete="off"
          style={[styles.input, tckn.length === 11 && !tcOk && styles.invalid]}
          accessibilityLabel="T.C. kimlik numarası"
        />
        {tckn.length === 11 && !tcOk ? (
          <AppText variant="caption" color={colors.danger}>
            Numara geçersiz görünüyor.
          </AppText>
        ) : null}
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Ad (kimlikteki gibi, ikinci ad dahil)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={60}
          style={styles.input}
          accessibilityLabel="Ad"
        />
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Soyad"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={60}
          style={styles.input}
          accessibilityLabel="Soyad"
        />
        <TextInput
          value={year}
          onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
          placeholder="Doğum yılı (ör. 1988)"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.input}
          accessibilityLabel="Doğum yılı"
        />
      </View>

      <Pressable
        onPress={() => setConsent((c) => !c)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        accessibilityLabel="Kimlik bilgilerimin doğrulama için işlenmesine açık rıza veriyorum"
        style={styles.consent}
      >
        <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={22} color={consent ? colors.primary : colors.textSecondary} />
        <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
          Kimlik bilgilerimin yalnızca bu doğrulama için Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü servisine iletilmesine açık rıza
          veriyorum. Bilgiler saklanmaz; yalnızca doğrulama zamanı ve kimlik numarasının geri döndürülemez bir özeti (aynı kimliğin ikinci
          hesapta kullanılmasını önlemek için) tutulur. (KVKK md. 5)
        </AppText>
      </Pressable>

      <Button
        label={busy ? 'Doğrulanıyor…' : 'Kimliğimi doğrula'}
        icon="shield-checkmark"
        onPress={submit}
        loading={busy}
        disabled={!ready}
      />

      <AppText variant="caption">
        Not: Bu doğrulama bilgilerin nüfus kaydıyla eşleştiğini gösterir. e-Devlet Kapısı ile giriş, kamu kurumlarıyla yapılan resmî
        protokol gerektirir ve bu prototipte yoktur.
      </AppText>
      <Button
        label="Bilgi güvenliği nasıl sağlanıyor?"
        icon="information-circle-outline"
        variant="ghost"
        onPress={() => router.push('/guven')}
      />
    </Page>
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
  invalid: { borderColor: colors.danger },
  consent: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: spacing.xs },
  done: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
}));
