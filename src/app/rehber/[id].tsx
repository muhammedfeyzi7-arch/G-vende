import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { AppText, Button, StateMessage } from '@/components/ui';
import { Page } from '@/components/ds';
import { call112 } from '@/features/home/tabs';
import { GuideArt } from '@/features/guide/Art';
import { CATEGORIES, EMERGENCY_NUMBER, shown, topicById, topicSources, type Item } from '@/features/guide/content';
import { OfflineNote, SourceList } from '@/features/guide/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';

function Section({
  title,
  icon,
  tone,
  items,
  numbered,
}: {
  title: string;
  icon: 'checkmark-circle' | 'close-circle';
  tone: string;
  items: Item[];
  numbered?: boolean;
}) {
  if (!items.length) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {items.map((it, i) => (
        <View key={i} style={styles.item}>
          {numbered ? (
            <View style={[styles.num, { backgroundColor: tone }]}>
              <AppText variant="label" color="#fff" style={{ fontWeight: '800' }}>
                {i + 1}
              </AppText>
            </View>
          ) : (
            <Ionicons name={icon} size={24} color={tone} accessibilityLabel={icon === 'close-circle' ? 'Yapmayın' : 'Yapın'} />
          )}
          <AppText variant="body" style={{ flex: 1, fontSize: 15.5, lineHeight: 22 }}>
            {it.t}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Rehber konusu: Ne yapmalıyım → Neden → Ne yapmamalıyım → görsel → kaynak ve doğrulama tarihi. */
export default function GuideTopic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const t = topicById(id ?? '');
  if (!t)
    return <StateMessage icon="book-outline" title="Rehber bulunamadı" message="Bu konu kaldırılmış veya doğrulama bekliyor olabilir." />;
  const cat = CATEGORIES.find((c) => c.id === t.cat)!;
  const why = shown(t.why);

  return (
    <Page>
      <Stack.Screen options={{ title: cat.title }} />
      <View style={styles.hero}>
        <GuideArt id={t.art} width={Math.min(width, 640) - spacing.md * 4} />
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="title" accessibilityRole="header">
          {t.title}
        </AppText>
        <AppText variant="label">{t.short}</AppText>
      </View>

      <Section title="Ne yapmalıyım?" icon="checkmark-circle" tone={cat.color} items={shown(t.doList)} numbered />

      {why.length ? (
        <View style={styles.why}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
              Neden?
            </AppText>
            {why.map((w, i) => (
              <AppText key={i} variant="body" style={{ fontSize: 14.5, lineHeight: 21 }}>
                {w.t}
              </AppText>
            ))}
          </View>
        </View>
      ) : null}

      <Section title="Ne yapmamalıyım?" icon="close-circle" tone={colors.danger} items={shown(t.dontList)} />

      {t.link ? <Button label={t.link.label} icon="arrow-forward" variant="secondary" onPress={() => router.push(t.link!.href)} /> : null}
      <Button label={`Hayati tehlike varsa ${EMERGENCY_NUMBER}’yi arayın`} icon="call" variant="danger" onPress={call112} />

      <OfflineNote />
      <SourceList sources={topicSources(t)} />
    </Page>
  );
}

const styles = themedStyles(() => ({
  hero: { alignItems: 'center', padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  why: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '12',
  },
}));
