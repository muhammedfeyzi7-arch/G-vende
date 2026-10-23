import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Page } from '@/components/ds';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';

const FIELDS = [
  ['bloodType', 'Kan grubu', 'ör. A Rh+'],
  ['conditions', 'Kronik hastalık / alerji', 'ör. Astım, penisilin alerjisi'],
  ['medications', 'Kullanılan ilaçlar', 'ör. İnsülin'],
  ['contacts', 'Acil durumda aranacak kişiler', 'ör. Eşim 0532…'],
] as const;

/** Kurtarma ekiplerine gösterilebilecek sağlık bilgileri — yalnızca bu cihazda saklanır. */
export default function HealthInfo() {
  const { settings, updateSettings } = useApp();
  const [info, setInfo] = useState(settings.emergencyInfo);
  return (
    <Page keyboard>
      <AppText variant="label">Bu bilgiler sunucuya gönderilmez. Acil Durum Modu’nda büyük yazıyla gösterilir.</AppText>
      {FIELDS.map(([key, label, ph]) => (
        <View key={key} style={{ gap: 6 }}>
          <AppText variant="label" color={colors.text}>
            {label}
          </AppText>
          <TextInput
            value={info[key]}
            onChangeText={(v) => setInfo((s) => ({ ...s, [key]: v }))}
            placeholder={ph}
            placeholderTextColor={colors.textMuted}
            multiline={key !== 'bloodType'}
            maxLength={300}
            style={styles.input}
            accessibilityLabel={label}
          />
        </View>
      ))}
      <Button
        label="Kaydet"
        icon="checkmark"
        onPress={() => {
          updateSettings({ emergencyInfo: info });
          router.back();
        }}
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
    padding: spacing.md,
    fontSize: 14,
  },
}));
