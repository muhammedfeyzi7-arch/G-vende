import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, TextInput } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Page } from '@/components/ds';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { friendlyError, getSupabase } from '@/services/supabase';
import { colors, radius, spacing } from '@/theme';

/** Geri bildirim: girişliyse sunucuya kaydedilir; değilse metin paylaşım menüsüyle iletilebilir. */
export default function Feedback() {
  const { session } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const version = Constants.expoConfig?.version ?? '';
  const canSend = isBackendConfigured() && !!session;

  const send = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb
      .from('feedback')
      .insert({ message: text.trim(), app_version: version, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    setBusy(false);
    if (error) return Alert.alert('Gönderilemedi', friendlyError(error));
    Alert.alert('Teşekkürler', 'Geri bildiriminiz alındı.', [{ text: 'Tamam', onPress: () => router.back() }]);
  };

  return (
    <Page keyboard>
      <AppText variant="label">Hata, öneri veya eksik bir bilgiyi yazın. Kişisel bilgi (TC kimlik, adres) paylaşmayın.</AppText>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        placeholder="Geri bildiriminiz…"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        accessibilityLabel="Geri bildirim metni"
      />
      <AppText variant="caption" style={{ textAlign: 'right' }}>
        {text.length}/2000
      </AppText>
      {canSend ? (
        <Button label="Gönder" icon="send" loading={busy} disabled={text.trim().length < 3} onPress={send} />
      ) : (
        <>
          <AppText variant="caption">
            {isBackendConfigured()
              ? 'Uygulama üzerinden göndermek için giriş yapın.'
              : 'Bu kurulumda sunucu yok; metni istediğiniz uygulamayla paylaşabilirsiniz.'}
          </AppText>
          <Button
            label="Metni paylaş"
            icon="share-outline"
            variant="secondary"
            disabled={text.trim().length < 3}
            onPress={() => Share.share({ message: `GÜVENDE v${version} (${Platform.OS}) geri bildirim:\n\n${text.trim()}` })}
          />
          {isBackendConfigured() ? <Button label="Giriş yap" onPress={() => router.push('/giris')} /> : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
