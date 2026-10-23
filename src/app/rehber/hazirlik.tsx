import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { GroupTitle, Page, ProgressRing } from '@/components/ds';
import { PREP_KEY, prepChecklist, prepProgress } from '@/features/guide/prep';
import { readJson, writeJson } from '@/services/storage';
import { colors, radius, spacing, themedStyles } from '@/theme';

/**
 * Deprem öncesi hazırlık kontrol listesi (AFAD önerilerinden). İşaretler yalnızca bu cihazda saklanır;
 * hesap veya internet gerekmez (acil durumda giriş/abonelik adımı olmasın diye sunucuya gönderilmez).
 */
export default function PrepChecklist() {
  const [checked, setChecked] = useState<string[]>([]);
  useEffect(() => {
    readJson<string[]>(PREP_KEY).then((v) => v && setChecked(v));
  }, []);
  const groups = useMemo(() => prepChecklist(), []);
  const { done, total, percent } = prepProgress(checked);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      writeJson(PREP_KEY, next);
      return next;
    });
  };

  return (
    <Page>
      <View style={styles.top}>
        <ProgressRing value={done} total={total} size={110}>
          <AppText variant="title">%{percent}</AppText>
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="heading">Hazırlık durumunuz</AppText>
          <AppText variant="label">
            {done}/{total} adım tamam. {done === total ? 'Planınızı altı ayda bir gözden geçirin.' : 'Tamamladıklarınızı işaretleyin.'}
          </AppText>
          <AppText variant="caption">Bu cihazda saklanır; internet ve hesap gerekmez.</AppText>
        </View>
      </View>

      {groups.map((g) => (
        <View key={g.topicId} style={{ gap: spacing.xs }}>
          <GroupTitle>{g.title}</GroupTitle>
          <View style={styles.group}>
            {g.items.map((it, i) => {
              const on = checked.includes(it.key);
              return (
                <Pressable
                  key={it.key}
                  onPress={() => toggle(it.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={it.text}
                  style={[styles.row, i > 0 && styles.divider]}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? colors.safe : colors.textSecondary} />
                  <AppText variant="body" style={{ flex: 1, fontSize: 15, lineHeight: 21, opacity: on ? 0.75 : 1 }}>
                    {it.text}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable onPress={() => router.push('/canta')} accessibilityRole="button" style={styles.link}>
        <Ionicons name="bag-handle-outline" size={20} color={colors.primary} />
        <AppText variant="label" color={colors.primary} style={{ flex: 1, fontWeight: '700' }}>
          Acil durum çantası kontrol listesi
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
      <AppText variant="caption">Kaynak: AFAD, “Deprem Öncesi, Anı ve Sonrası Alabileceğiniz Önlemleri Biliyor Musunuz?” ve “Önlemini Al, Güvende Kal” (2018). Rehberdeki konu sayfalarında bağlantılar ve doğrulama tarihleri yer alır.</AppText>
    </Page>
  );
}

const styles = themedStyles(() => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface },
  group: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
}));
