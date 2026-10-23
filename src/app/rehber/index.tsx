import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { AppText } from '@/components/ui';
import { Page } from '@/components/ds';
import { GuideArt } from '@/features/guide/Art';
import { CATEGORIES, PUBLISHED_TOPICS, SOURCES, type Category } from '@/features/guide/content';
import { OfflineNote, SourceList } from '@/features/guide/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';

/** Acil Durum Rehberi merkezi: kategoriler, görsel konu kartları, araçlar ve kaynaklar (internetsiz). */
export default function GuideCenter() {
  const { kategori } = useLocalSearchParams<{ kategori?: Category }>();
  const { width } = useWindowDimensions();
  // İki sütun; küçük ekranlarda (≤340 pt) tek sütun.
  const twoCol = width > 340;
  const cardW = twoCol ? (Math.min(width, 640) - spacing.md * 2 - spacing.sm) / 2 : Math.min(width, 640) - spacing.md * 2;
  const cats = kategori ? CATEGORIES.filter((c) => c.id === kategori) : CATEGORIES;

  return (
    <Page>
      <Pressable
        onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: 'during-indoor' } })}
        accessibilityRole="button"
        accessibilityLabel="Şu an sarsıntı mı var? Çök, kapan, tutun talimatını aç"
        style={({ pressed }) => [styles.now, pressed && { opacity: 0.9 }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" color="#fff" style={{ fontSize: 18 }}>
            Şu an sarsıntı mı var?
          </AppText>
          <AppText variant="label" color="#FFE3E3">
            ÇÖK · KAPAN · TUTUN — sarsıntı geçene kadar
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <OfflineNote />

      {cats.map((c) => {
        const topics = PUBLISHED_TOPICS.filter((t) => t.cat === c.id);
        if (!topics.length) return null;
        return (
          <View key={c.id} style={{ gap: spacing.sm }}>
            <View style={styles.catHead} accessibilityRole="header">
              <View style={[styles.catBar, { backgroundColor: c.color }]} />
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{c.title}</AppText>
                <AppText variant="caption">{c.short}</AppText>
              </View>
            </View>
            <View style={styles.grid}>
              {topics.map((t, i) => {
                // Tek kalan kart (tek sayıda konu) tam genişlikte, yatay düzende: boş yarım alan kalmaz.
                const wide = twoCol && i === topics.length - 1 && topics.length % 2 === 1;
                const fullW = cardW * 2 + spacing.sm;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: t.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.title}. ${t.short}`}
                    style={({ pressed }) => [styles.card, { width: wide ? fullW : cardW }, wide && styles.wide, pressed && { opacity: 0.88 }]}
                  >
                    <GuideArt id={t.art} width={(wide ? cardW : cardW) - spacing.sm * 2} />
                    <View style={wide ? { flex: 1, gap: 4 } : { gap: 6 }}>
                      <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }} numberOfLines={2}>
                        {t.title}
                      </AppText>
                      <AppText variant="caption" numberOfLines={wide ? 2 : 1}>
                        {t.short}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {!kategori ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Araçlar</AppText>
          {(
            [
              { icon: 'checkbox-outline', label: 'Hazırlık kontrol listesi', sub: 'Evinizi ve planınızı hazırlayın', href: '/rehber/hazirlik' },
              { icon: 'bag-handle-outline', label: 'Acil durum çantası', sub: 'Çantanız hazır mı?', href: '/canta' },
              { icon: 'megaphone-outline', label: 'Enkaz Altı Modu', sub: 'Siren ve flaşla yerinizi duyurun', href: '/enkaz' },
            ] as const
          ).map((x) => (
            <Pressable
              key={x.href}
              onPress={() => router.push(x.href)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.tool, pressed && { opacity: 0.88 }]}
            >
              <Ionicons name={x.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                  {x.label}
                </AppText>
                <AppText variant="caption">{x.sub}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <SourceList sources={Object.values(SOURCES)} />
    </Page>
  );
}

const styles = themedStyles(() => ({
  now: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: '#C81E32',
  },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  catBar: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wide: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
}));
