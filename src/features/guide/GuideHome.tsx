import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { KIT_ITEMS } from '@/features/emergency/content';
import { useApp } from '@/providers/AppProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';
import { formatDateTr } from '@/utils/time';
import { GuideImage, type GuideImgKey } from './Art';
import { CHECKED_AT, isStale } from './content';

/** Kart görselinin metin tarafına doğru kart zeminine yumuşak geçişi (açık ve koyu temada). */
export function EdgeFade({ side = 'right', color, size = 28 }: { side?: 'right' | 'left' | 'bottom'; color: string; size?: number }) {
  const horizontal = side !== 'bottom';
  return (
    <LinearGradient
      pointerEvents="none"
      colors={side === 'left' ? [color, alpha(color, 0)] : [alpha(color, 0), color]}
      start={{ x: 0, y: 0 }}
      end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
      style={[
        { position: 'absolute' },
        side === 'right' && { right: 0, top: 0, bottom: 0, width: size },
        side === 'left' && { left: 0, top: 0, bottom: 0, width: size },
        side === 'bottom' && { left: 0, right: 0, bottom: 0, height: size },
      ]}
    />
  );
}

export function Chevron({ size = 30 }: { size?: number }) {
  return (
    <View style={[styles.chev, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="chevron-forward" size={size * 0.6} color={colors.text} />
    </View>
  );
}

type Tile = { title: string; sub: string; img: GuideImgKey; go: () => void };

const TILES: Tile[] = [
  {
    title: 'Deprem öncesi hazırlık',
    sub: 'Evinizi ve ailenizi hazırlayın.',
    img: 'home-safety',
    go: () => router.push({ pathname: '/rehber/kategori/[id]', params: { id: 'before' } }),
  },
  {
    title: 'Deprem anında',
    sub: 'Güvenli pozisyon alın.',
    img: 'drop-cover-hold',
    go: () => router.push({ pathname: '/rehber/kategori/[id]', params: { id: 'during' } }),
  },
  {
    title: 'Deprem sonrasında',
    sub: 'Güvenli şekilde hareket edin.',
    img: 'after-quake',
    go: () => router.push({ pathname: '/rehber/kategori/[id]', params: { id: 'after' } }),
  },
  {
    title: 'Enkaz altında kaldım',
    sub: 'Sakin kalın, yardım sinyali verin.',
    img: 'trapped',
    go: () => router.push({ pathname: '/rehber/[id]', params: { id: 'trapped' } }),
  },
  {
    title: 'Dışarıda veya araçtayım',
    sub: 'Bulunduğunuz yere göre davranın.',
    img: 'outdoor',
    go: () => router.push({ pathname: '/rehber/kategori/[id]', params: { id: 'outside' } }),
  },
  {
    title: 'Aileme nasıl ulaşırım?',
    sub: 'Güvenlik durumunu paylaşın.',
    img: 'family-plan',
    go: () => router.push({ pathname: '/rehber/[id]', params: { id: 'family' } }),
  },
];

/**
 * Acil Durum Rehberi ana ekranı (Acil Durum sekmesi). İçerik ve görseller uygulamaya gömülüdür:
 * internet, giriş veya ödeme gerektirmez.
 */
export function GuideHome({ bottomPad = 0, back }: { bottomPad?: number; back?: boolean }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings } = useApp();
  const stale = isStale();
  const pageW = Math.min(width, 640);
  const tileW = (pageW - spacing.md * 2 - spacing.sm) / 2;
  const kitDone = settings.kitChecked.filter((id) => KIT_ITEMS.some((k) => k.id === id)).length;
  const kitPct = KIT_ITEMS.length ? kitDone / KIT_ITEMS.length : 0;

  const offlineInfo = () =>
    Alert.alert(
      stale ? 'Rehber güncel olmayabilir' : 'Çevrimdışı erişilebilir',
      `Bu rehber ve görselleri telefonunuza yüklüdür; internet, giriş veya ödeme olmadan açılır.\n\nResmî kaynaklarla son karşılaştırma: ${formatDateTr(CHECKED_AT)}.`,
      [
        { text: 'Kaynaklar', onPress: () => router.push('/rehber/kaynaklar') },
        { text: 'Tamam', style: 'cancel' },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: bottomPad + spacing.xl,
        gap: spacing.md,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
      }}
    >
      {/* Üst bilgi */}
      <View style={styles.topRow}>
        {back ? (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" hitSlop={8} style={styles.info}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <GuideImage img="logo" style={{ width: 26, height: 29 }} />
        <AppText variant="heading" style={styles.brand}>
          GÜVENDE
        </AppText>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={offlineInfo}
          accessibilityRole="button"
          accessibilityLabel={stale ? 'Rehber güncel olmayabilir, ayrıntılar' : 'Çevrimdışı erişilebilir, ayrıntılar'}
          style={({ pressed }) => [styles.offline, stale && { borderColor: colors.warning }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name={stale ? 'warning-outline' : 'cloud-download-outline'} size={17} color={stale ? colors.warning : colors.safe} />
          <AppText
            variant="label"
            color={stale ? colors.warning : colors.safe}
            numberOfLines={1}
            style={{ fontSize: 11.5, fontWeight: '600', flexShrink: 1 }}
          >
            {stale ? 'Güncel olmayabilir' : 'Çevrimdışı erişilebilir'}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={stale ? colors.warning : colors.safe} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/rehber/kaynaklar')}
          accessibilityRole="button"
          accessibilityLabel="Kaynaklar ve bilgi"
          hitSlop={8}
          style={styles.info}
        >
          <Ionicons name="information-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ gap: 2 }}>
        <AppText variant="display" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36 }}>
          Acil Durum Rehberi
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={{ fontSize: 16 }}>
          Doğru bilgi. Hızlı erişim.
        </AppText>
      </View>

      {/* Şu an sarsıntı mı var? */}
      <Pressable
        onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: 'during-indoor' } })}
        accessibilityRole="button"
        accessibilityLabel="Şu an sarsıntı mı var? Çök, kapan, tutun. Sarsıntı geçene kadar güvenli pozisyonunuzu koruyun."
        style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient colors={['#A8151F', '#C81D26']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheetFill} />
        <View style={styles.heroArt}>
          <GuideImage img="drop-cover-hold-hero" style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={styles.heroText}>
          <AppText variant="display" color="#fff" numberOfLines={2} style={{ fontSize: 19.5, lineHeight: 25 }}>
            Şu an sarsıntı mı var?
          </AppText>
          <AppText variant="heading" color="#fff" style={{ fontSize: 16, letterSpacing: 0.4, marginTop: 4 }}>
            ÇÖK · KAPAN · TUTUN
          </AppText>
          <AppText variant="caption" color="#FFE1E3" style={{ fontSize: 12.5, lineHeight: 17, marginTop: 4 }}>
            Sarsıntı geçene kadar güvenli pozisyonunuzu koruyun.
          </AppText>
        </View>
        <View style={styles.heroBtn}>
          <Ionicons name="chevron-forward" size={26} color="#fff" />
        </View>
      </Pressable>

      {/* Hangi durumda ne yapmalıyım? */}
      <View style={styles.section} accessibilityRole="header">
        <View style={styles.sectionBar} />
        <AppText variant="heading" style={{ fontSize: 19 }}>
          Hangi durumda ne yapmalıyım?
        </AppText>
      </View>

      <View style={styles.grid}>
        {TILES.map((t) => (
          <Pressable
            key={t.title}
            onPress={t.go}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}. ${t.sub}`}
            style={({ pressed }) => [styles.tile, { width: tileW }, pressed && { opacity: 0.88 }]}
          >
            <View style={[styles.tileArt, { width: tileW * 0.36 }]}>
              <GuideImage img={t.img} style={{ width: '100%', height: '100%' }} />
              <EdgeFade color={colors.surface} size={18} />
            </View>
            <View style={styles.tileText}>
              <AppText variant="heading" style={{ fontSize: 13.5, lineHeight: 17 }}>
                {t.title}
              </AppText>
              <AppText variant="caption" style={{ fontSize: 11, lineHeight: 14 }}>
                {t.sub}
              </AppText>
            </View>
            <View style={styles.tileChev}>
              <Chevron size={26} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Acil durum çantası */}
      <Pressable
        onPress={() => router.push('/canta')}
        accessibilityRole="button"
        accessibilityLabel={`Acil durum çantam hazır mı? ${kitDone}/${KIT_ITEMS.length} tamamlandı`}
        style={({ pressed }) => [styles.kit, pressed && { opacity: 0.88 }]}
      >
        <View style={[styles.kitArt, { width: pageW * 0.32 }]}>
          <GuideImage img="backpack" style={{ width: '100%', height: '100%' }} />
          <EdgeFade color={colors.surface} size={22} />
        </View>
        <View style={{ flex: 1, gap: 4, paddingVertical: spacing.md }}>
          <AppText variant="heading" style={{ fontSize: 16.5 }}>
            Acil durum çantam hazır mı?
          </AppText>
          <AppText variant="label" style={{ fontSize: 14 }}>
            {kitDone}/{KIT_ITEMS.length} tamamlandı
          </AppText>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(kitPct * 100)}%` }]} />
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing.sm }}>
          <Chevron size={32} />
        </View>
      </Pressable>

      {/* Hayati araçlar her zaman bir dokunuşta (rehberin altında) */}
      <View style={styles.tools}>
        <Pressable
          onPress={() => Linking.openURL('tel:112').catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel="112’yi ara"
          style={({ pressed }) => [styles.tool, styles.call, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <AppText variant="heading" color="#fff" style={{ fontSize: 14 }}>
            112’yi Ara
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/acil-araclar')}
          accessibilityRole="button"
          accessibilityLabel="Acil araçlar: Enkaz Altı Modu, hazır mesajlar, fener"
          style={({ pressed }) => [styles.tool, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="megaphone-outline" size={18} color={colors.danger} />
          <AppText variant="heading" style={{ fontSize: 14 }} numberOfLines={1}>
            Acil araçlar
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/rehber/kaynaklar')} accessibilityRole="link" style={styles.foot}>
        <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
        <AppText variant="caption" style={{ fontSize: 12, textAlign: 'center', flexShrink: 1 }}>
          Resmî kaynaklara dayalı rehber · Son doğrulama {formatDateTr(CHECKED_AT)}
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

const StyleSheetFill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

const styles = themedStyles(() => ({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  brand: { fontSize: 19, fontWeight: '800', letterSpacing: 0.2 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: alpha(colors.safe, 0.7),
    backgroundColor: alpha(colors.safe, 0.08),
    flexShrink: 1,
  },
  info: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hero: {
    minHeight: 132,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0424C',
    boxShadow: '0 8px 24px rgba(200,29,38,0.30)',
  },
  heroArt: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' },
  heroText: { width: '66%', paddingVertical: spacing.md, paddingLeft: spacing.md },
  heroBtn: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -23,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF3B4E',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },
  section: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionBar: { width: 5, height: 24, borderRadius: 3, backgroundColor: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    minHeight: 100,
    flexDirection: 'row',
    borderRadius: radius.lg + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tileArt: { alignSelf: 'stretch' },
  tileText: { flex: 1, justifyContent: 'center', gap: 3, paddingLeft: 4, paddingRight: 30, paddingVertical: spacing.sm },
  tileChev: { position: 'absolute', right: 5, top: 0, bottom: 0, justifyContent: 'center' },
  chev: { backgroundColor: alpha(colors.textSecondary, 0.16), alignItems: 'center', justifyContent: 'center' },
  kit: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 96,
    borderRadius: radius.lg + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  kitArt: { alignSelf: 'stretch' },
  track: { height: 9, borderRadius: 5, backgroundColor: alpha(colors.textSecondary, 0.18), overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.safe },
  tools: { flexDirection: 'row', gap: spacing.sm },
  tool: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  call: { backgroundColor: '#C81E32', borderColor: '#C81E32' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.xs },
}));
