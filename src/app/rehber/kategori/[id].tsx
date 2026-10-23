import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, StateMessage } from '@/components/ui';
import { ProgressRing } from '@/components/ds';
import { GuideImage, artImg, type GuideImgKey } from '@/features/guide/Art';
import { Chevron, EdgeFade } from '@/features/guide/GuideHome';
import { PUBLISHED_TOPICS, type Topic } from '@/features/guide/content';
import { groupProgress, possessive, prepGroups, prepProgress, type PrepGroup } from '@/features/guide/prep';
import { usePrepChecked } from '@/features/guide/usePrepChecked';
import { useApp } from '@/providers/AppProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';

type CatId = 'before' | 'during' | 'after' | 'outside';
const OUTSIDE = ['during-outdoor', 'during-vehicle', 'during-transit'];

const CATS: Record<CatId, { title: string; sub: string; img: GuideImgKey; topics: () => Topic[] }> = {
  before: {
    title: 'Deprem öncesi hazırlık',
    sub: 'Kendinizi, ailenizi ve evinizi depreme karşı hazırlayın.',
    img: 'home-safety',
    topics: () => [],
  },
  during: {
    title: 'Deprem anında',
    sub: 'Sarsıntı sırasında bulunduğunuz yere göre kendinizi koruyun.',
    img: 'drop-cover-hold',
    topics: () => PUBLISHED_TOPICS.filter((t) => t.cat === 'during'),
  },
  after: {
    title: 'Deprem sonrasında',
    sub: 'Sarsıntı bitince güvenli şekilde hareket edin.',
    img: 'after-quake',
    topics: () => PUBLISHED_TOPICS.filter((t) => t.cat === 'after'),
  },
  outside: {
    title: 'Dışarıda veya araçtayım',
    sub: 'Sokakta, araçta veya toplu taşımada ne yapmalı?',
    img: 'outdoor',
    topics: () => OUTSIDE.map((id) => PUBLISHED_TOPICS.find((t) => t.id === id)).filter((t): t is Topic => !!t),
  },
};

function Row({
  img,
  title,
  sub,
  right,
  bottom,
  onPress,
  label,
}: {
  img: GuideImgKey;
  title: string;
  sub: string;
  right?: ReactNode;
  bottom?: ReactNode;
  onPress: () => void;
  label: string;
}) {
  const { width } = useWindowDimensions();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
    >
      <View style={{ width: Math.min(width, 640) * 0.27, alignSelf: 'stretch' }}>
        <GuideImage img={img} style={{ width: '100%', height: '100%' }} />
        <EdgeFade color={colors.surface} size={16} />
      </View>
      <View style={{ flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.xs, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="heading" style={{ fontSize: 16 }}>
              {title}
            </AppText>
            <AppText variant="caption" style={{ fontSize: 12.5, lineHeight: 17 }}>
              {sub}
            </AppText>
          </View>
          {right}
          <Chevron size={30} />
        </View>
        {bottom}
      </View>
      <View style={{ width: spacing.sm }} />
    </Pressable>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

function openGroup(g: PrepGroup) {
  if (g.kind === 'kit') router.push('/canta');
  else router.push({ pathname: '/rehber/hazirlik', params: { grup: g.id } });
}

/** Rehber kategorisi: üst görsel, (hazırlıkta) ilerleme ve görselli konu/grup satırları. */
export default function GuideCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings } = useApp();
  const checked = usePrepChecked();
  const cat = CATS[id as CatId];
  if (!cat) return <StateMessage icon="book-outline" title="Bölüm bulunamadı" message="Rehberdeki bölümlerden birini seçin." />;

  const isPrep = id === 'before';
  const groups = isPrep ? prepGroups() : [];
  const kit = settings.kitChecked;
  const total = prepProgress(checked, kit);
  const next = groups.find((g) => {
    const p = groupProgress(g, checked, kit);
    return p.done < p.total;
  });
  const headW = Math.min(width, 640) * 0.4;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.md, minHeight: insets.top + 170 }}>
        <View style={[styles.headArt, { width: headW, height: headW, top: insets.top }]}>
          <GuideImage img={cat.img} style={{ width: '100%', height: '100%' }} />
          <EdgeFade side="left" color={colors.bg} size={48} />
          <EdgeFade side="bottom" color={colors.bg} size={28} />
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Acil Durum Rehberi’ne dön"
          hitSlop={8}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <AppText variant="body" color={colors.text} style={{ fontSize: 16 }}>
            Acil Durum Rehberi
          </AppText>
        </Pressable>
        <View style={{ marginTop: spacing.lg, gap: 6 }}>
          <AppText variant="display" accessibilityRole="header" style={{ fontSize: 23, lineHeight: 29, maxWidth: '68%' }}>
            {cat.title}
          </AppText>
          <AppText variant="label" style={{ fontSize: 13.5, lineHeight: 18, maxWidth: '64%' }}>
            {cat.sub}
          </AppText>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.sm }}>
        {isPrep ? (
          <>
            <View style={styles.status}>
              <ProgressRing value={total.done} total={total.total} size={100}>
                <AppText variant="title" style={{ fontSize: 24 }}>
                  %{total.percent}
                </AppText>
              </ProgressRing>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="heading" style={{ fontSize: 17 }}>
                  Hazırlık durumunuz
                </AppText>
                <AppText variant="label" style={{ fontSize: 13.5 }}>
                  {total.total} adımın {possessive(total.done)} tamamlandı.
                </AppText>
                <AppText variant="caption" style={{ fontSize: 12 }}>
                  Daha güvenli bir gelecek için hazırlıklarınızı tamamlayın.
                </AppText>
                <Pressable
                  onPress={() => router.push('/rehber/hazirlik')}
                  accessibilityRole="button"
                  accessibilityLabel="Tüm liste"
                  style={({ pressed }) => [styles.allBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="stats-chart" size={15} color={colors.text} />
                  <AppText variant="label" color={colors.text} style={{ fontWeight: '600' }}>
                    Tüm liste
                  </AppText>
                  <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/rehber/hazirlik')}
              accessibilityRole="button"
              accessibilityLabel="Küçük adımlarla büyük fark. Hazırlık kontrol listesini aç."
              style={({ pressed }) => [styles.green, pressed && { opacity: 0.9 }]}
            >
              <LinearGradient colors={['#0A6A5F', '#034E4A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fillAbs} />
              <View style={{ width: Math.min(width, 640) * 0.27, alignSelf: 'stretch' }}>
                <GuideImage img="checklist" style={{ width: '100%', height: '100%' }} />
                <EdgeFade color="#076158" size={18} />
              </View>
              <View style={{ flex: 1, gap: 4, paddingVertical: spacing.md }}>
                <AppText variant="heading" color="#fff" style={{ fontSize: 17 }}>
                  Küçük adımlarla büyük fark
                </AppText>
                <AppText variant="caption" color="#D2F3EC" style={{ fontSize: 13, lineHeight: 18 }}>
                  Bugün yapacağınız bir hazırlık, yarın hayat kurtarabilir.
                </AppText>
              </View>
              <View style={[styles.darkChev]}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </View>
            </Pressable>

            {groups.map((g) => {
              const p = groupProgress(g, checked, kit);
              return (
                <Row
                  key={g.id}
                  img={g.img}
                  title={g.title}
                  sub={g.sub}
                  label={`${g.title}. ${p.done}/${p.total} tamamlandı`}
                  onPress={() => openGroup(g)}
                  right={
                    <View style={styles.badge}>
                      <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                        {p.done}/{p.total}
                      </AppText>
                    </View>
                  }
                  bottom={<Bar value={p.total ? p.done / p.total : 0} />}
                />
              );
            })}

            <View style={styles.tip}>
              <View style={styles.bulb}>
                <Ionicons name="bulb-outline" size={24} color="#3A2A05" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading" style={{ fontSize: 15 }}>
                  {next ? 'Hazırlıklarınızı tamamlayın' : 'Hazırlıklarınız tamam'}
                </AppText>
                <AppText variant="caption" style={{ fontSize: 12 }}>
                  {next
                    ? 'Eksik adımları tamamlayarak daha güvenli olabilirsiniz.'
                    : 'Planınızı altı ayda bir gözden geçirip tatbikat yapın.'}
                </AppText>
              </View>
              {next ? (
                <Pressable
                  onPress={() => openGroup(next)}
                  accessibilityRole="button"
                  accessibilityLabel={`Devam et: ${next.title}`}
                  style={({ pressed }) => [styles.cont, pressed && { opacity: 0.85 }]}
                >
                  <AppText variant="label" color="#2A1E02" style={{ fontWeight: '700' }}>
                    Devam et
                  </AppText>
                  <Ionicons name="chevron-forward" size={15} color="#2A1E02" />
                </Pressable>
              ) : null}
            </View>
          </>
        ) : (
          cat
            .topics()
            .map((t) => (
              <Row
                key={t.id}
                img={artImg(t.art)}
                title={t.title}
                sub={t.short}
                label={`${t.title}. ${t.short}`}
                onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: t.id } })}
              />
            ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  headArt: { position: 'absolute', right: 0, borderBottomLeftRadius: radius.xl, overflow: 'hidden' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    marginTop: 4,
    borderRadius: radius.pill,
    backgroundColor: alpha(colors.textSecondary, 0.14),
  },
  green: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 96,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#13A08F',
    paddingRight: spacing.md,
  },
  fillAbs: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  darkChev: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    minHeight: 96,
    borderRadius: radius.lg + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 46,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.textSecondary, 0.14),
  },
  track: { height: 7, borderRadius: 4, backgroundColor: alpha(colors.textSecondary, 0.18), overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.safe },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulb: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F4C85C', alignItems: 'center', justifyContent: 'center' },
  cont: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#F4C85C',
  },
}));
