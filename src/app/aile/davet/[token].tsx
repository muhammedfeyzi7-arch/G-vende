import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { acceptInvite } from '@/features/family/api';
import { useApp } from '@/providers/AppProvider';
import { friendlyError } from '@/services/supabase';
import { colors, radius, spacing, themedStyles } from '@/theme';

/** guvende://aile/davet/<token> derin bağlantısı */
export default function AcceptInvite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useApp();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <AppText variant="heading">Bir aile grubuna davet edildiniz</AppText>
      <AppText variant="label">
        Katıldığınızda grup üyeleri adınızı ve bildirdiğiniz güvenlik durumunu görür. Konum paylaşımı varsayılan olarak kapalıdır.
      </AppText>
      {!session ? (
        <Button label="Önce giriş yapın" onPress={() => router.push('/giris')} />
      ) : (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Grupta görünecek adınız"
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            style={styles.input}
          />
          <Button
            label="Katıl"
            loading={busy}
            disabled={!name.trim() || !token}
            onPress={async () => {
              setBusy(true);
              try {
                await acceptInvite(token!, name.trim());
                router.replace('/ailem');
              } catch (e) {
                Alert.alert('Katılınamadı', friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </ScrollView>
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
