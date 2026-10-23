import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card } from '@/components/ui';
import { PROVINCES } from '@/features/settings/provinces';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const { location, requestLocation, settings, setManualProvince } = useApp();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => {
    const n = q.trim().toLocaleLowerCase('tr-TR');
    return n ? PROVINCES.filter((p) => p.name.toLocaleLowerCase('tr-TR').includes(n)) : PROVINCES;
  }, [q]);

  const denied = location.status === 'denied';
  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.name}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs, paddingBottom: insets.bottom + spacing.xxl }}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="heading">Cihaz konumu</AppText>
            <AppText variant="label">
              {location.status === 'granted'
                ? 'Konum izni verildi. Konumunuz yalnızca bu cihazda mesafe hesabı için kullanılır.'
                : denied
                  ? 'Konum izni reddedildi. Ayarlardan izin verebilir veya aşağıdan ilinizi seçebilirsiniz.'
                  : 'Size en yakın depremleri ve toplanma alanlarını göstermek için konum izni isteyebiliriz. Arka planda konum kullanılmaz.'}
            </AppText>
            {location.status !== 'granted' ? (
              denied && !location.canAskAgain ? (
                <Button label="Ayarları aç" icon="settings-outline" variant="secondary" onPress={() => Linking.openSettings()} />
              ) : (
                <Button
                  label="Konumumu kullan"
                  icon="locate"
                  loading={busy}
                  onPress={async () => {
                    setBusy(true);
                    await requestLocation();
                    setBusy(false);
                  }}
                />
              )
            ) : null}
          </Card>
          <AppText variant="heading">veya ilinizi seçin</AppText>
          <AppText variant="caption">İl merkezi yaklaşık konum olarak kullanılır; mesafeler kaba tahmindir.</AppText>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="İl ara"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            accessibilityLabel="İl ara"
          />
          {settings.manualProvince ? (
            <Button label="Seçimi kaldır" variant="ghost" icon="close-circle-outline" onPress={() => setManualProvince(null)} />
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const active = settings.manualProvince === item.name;
        return (
          <Pressable
            onPress={() => {
              setManualProvince(item.name);
              router.back();
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={({ pressed }) => [styles.row, (pressed || active) && { backgroundColor: colors.surfaceRaised }]}
          >
            <AppText variant="body" style={{ flex: 1 }}>
              {item.name}
            </AppText>
            {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = themedStyles(() => ({
  search: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderRadius: radius.sm },
}));
