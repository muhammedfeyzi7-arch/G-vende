import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button, Card } from '@/components/ui';
import { CONTENT_SOURCE, GUIDES, KIT_ITEMS } from '@/features/emergency/content';
import { EmergencyTools } from '@/features/emergency/EmergencyTools';
import { call112 } from '@/features/home/tabs';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing } from '@/theme';

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { settings, updateSettings, online } = useApp();
  const [open, setOpen] = useState<string | null>('during');
  const [editing, setEditing] = useState(false);
  const [info, setInfo] = useState(settings.emergencyInfo);

  const toggleKit = (id: string) =>
    updateSettings({
      kitChecked: settings.kitChecked.includes(id) ? settings.kitChecked.filter((x) => x !== id) : [...settings.kitChecked, id],
    });

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: tabBarHeight + spacing.xl,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="title" style={{ fontSize: 24 }}>
        Acil Durum
      </AppText>
      {!online ? (
        <Banner icon="cloud-offline-outline" tone="warning" text="Çevrimdışısınız. Bu sayfadaki bilgiler internetsiz kullanılabilir." />
      ) : null}

      <Card style={{ gap: spacing.sm, borderColor: colors.dangerBorder, backgroundColor: colors.dangerSurface }}>
        <AppText variant="heading">112 Acil Çağrı Merkezi</AppText>
        <AppText variant="label" color="#F6C9CE">
          Yaralanma, yangın, enkaz veya hayati tehlike durumunda arayın. Ambulans, itfaiye, polis ve AFAD çağrıları 112’de birleşiktir.
        </AppText>
        <Button label="112’yi ara" icon="call" variant="danger" onPress={call112} />
      </Card>

      <EmergencyTools />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon="people-outline"
          label="Toplanma alanları"
          onPress={() => router.push('/toplanma')}
        />
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon="shield-checkmark-outline"
          label="Güvendeyim"
          onPress={() => router.push('/ailem')}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Güvenlik talimatları</AppText>
        {GUIDES.map((g) => {
          const isOpen = open === g.id;
          return (
            <Card key={g.id} style={{ padding: 0 }}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : g.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                style={styles.guideHeader}
              >
                <Ionicons name={g.icon} size={22} color={colors.primary} />
                <AppText variant="heading" style={{ flex: 1, fontSize: 16 }}>
                  {g.title}
                </AppText>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Pressable>
              {isOpen ? (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm }}>
                  {g.steps.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <AppText variant="label" color={colors.primary} style={{ width: 18 }}>
                        {i + 1}.
                      </AppText>
                      <AppText variant="body" style={{ flex: 1 }}>
                        {s}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })}
        <Pressable onPress={() => Linking.openURL(CONTENT_SOURCE.url)} accessibilityRole="link">
          <AppText variant="caption">Kaynak: {CONTENT_SOURCE.name}. Güncel ve tam metin için afad.gov.tr ↗</AppText>
        </Pressable>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="heading" style={{ flex: 1 }}>
            Acil durum bilgilerim
          </AppText>
          <Pressable
            onPress={() => (editing ? (updateSettings({ emergencyInfo: info }), setEditing(false)) : setEditing(true))}
            accessibilityRole="button"
            style={{ padding: 6 }}
          >
            <AppText variant="label" color={colors.primary}>
              {editing ? 'Kaydet' : 'Düzenle'}
            </AppText>
          </Pressable>
        </View>
        <AppText variant="caption">Yalnızca bu cihazda saklanır, sunucuya gönderilmez.</AppText>
        {(
          [
            ['bloodType', 'Kan grubu'],
            ['conditions', 'Kronik hastalık / alerji'],
            ['medications', 'Kullanılan ilaçlar'],
            ['contacts', 'Acil durumda aranacak kişiler'],
          ] as const
        ).map(([key, label]) => (
          <View key={key} style={{ gap: 4 }}>
            <AppText variant="label">{label}</AppText>
            {editing ? (
              <TextInput
                value={info[key]}
                onChangeText={(v) => setInfo((s) => ({ ...s, [key]: v }))}
                multiline={key !== 'bloodType'}
                maxLength={300}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
                placeholder="—"
                accessibilityLabel={label}
              />
            ) : (
              <AppText variant="body">{settings.emergencyInfo[key] || '—'}</AppText>
            )}
          </View>
        ))}
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <AppText variant="heading">
          Afet ve acil durum çantası ({settings.kitChecked.length}/{KIT_ITEMS.length})
        </AppText>
        {KIT_ITEMS.map((k) => {
          const checked = settings.kitChecked.includes(k.id);
          return (
            <Pressable
              key={k.id}
              onPress={() => toggleKit(k.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              style={styles.kitRow}
            >
              <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? colors.safe : colors.textMuted} />
              <AppText variant="body" style={{ flex: 1, color: checked ? colors.textSecondary : colors.text }}>
                {k.label}
              </AppText>
            </Pressable>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 56 },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.sm,
    fontSize: 15,
  },
  kitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
});
