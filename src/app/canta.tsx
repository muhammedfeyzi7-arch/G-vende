import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { GroupTitle, Page, ProgressRing } from '@/components/ds';
import { KIT_GROUPS, KIT_ITEMS } from '@/features/emergency/content';
import { useApp } from '@/providers/AppProvider';
import { colors, radius, spacing, themedStyles } from '@/theme';

/** Afet ve acil durum çantası kontrol listesi (cihazda saklanır, internetsiz çalışır). */
export default function KitScreen() {
  const { settings, updateSettings } = useApp();
  const done = settings.kitChecked.filter((id) => KIT_ITEMS.some((k) => k.id === id)).length;
  const toggle = (id: string) =>
    updateSettings({
      kitChecked: settings.kitChecked.includes(id) ? settings.kitChecked.filter((x) => x !== id) : [...settings.kitChecked, id],
    });
  return (
    <Page>
      <View style={styles.top}>
        <ProgressRing value={done} total={KIT_ITEMS.length} size={110}>
          <AppText variant="title">
            {done}/{KIT_ITEMS.length}
          </AppText>
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="heading">Hazır olma durumunuz</AppText>
          <AppText variant="label">
            {done === KIT_ITEMS.length
              ? 'Çantanız hazır. Su, gıda ve ilaçların son kullanma tarihlerini 6 ayda bir kontrol edin.'
              : 'Eksik malzemeleri tamamlayıp işaretleyin.'}
          </AppText>
        </View>
      </View>
      {KIT_GROUPS.map((g) => (
        <View key={g} style={{ gap: spacing.xs }}>
          <GroupTitle>{g}</GroupTitle>
          <View style={styles.group}>
            {KIT_ITEMS.filter((k) => k.group === g).map((k, i) => {
              const on = settings.kitChecked.includes(k.id);
              return (
                <Pressable
                  key={k.id}
                  onPress={() => toggle(k.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.item, i > 0 && styles.divider]}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.safe : colors.textMuted} />
                  <AppText variant="body" style={{ flex: 1, color: on ? colors.textSecondary : colors.text }}>
                    {k.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <AppText variant="caption">Liste AFAD’ın afet ve acil durum çantası önerilerinden özetlenmiştir.</AppText>
      {done ? (
        <Button
          label="İşaretleri sıfırla"
          variant="ghost"
          icon="refresh"
          onPress={() =>
            Alert.alert('Listeyi sıfırla', 'Tüm işaretler kaldırılsın mı?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sıfırla', style: 'destructive', onPress: () => updateSettings({ kitChecked: [] }) },
            ])
          }
        />
      ) : null}
    </Page>
  );
}

const styles = themedStyles(() => ({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
}));
