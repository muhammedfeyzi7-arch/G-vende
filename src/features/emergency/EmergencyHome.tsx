import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { Icon } from '@/components/ds';
import { useFamilyActions } from '@/features/family/useFamilyActions';
import { GuideImage, type GuideImgKey } from '@/features/guide/Art';
import { EdgeFade } from '@/features/guide/GuideHome';
import { useApp } from '@/providers/AppProvider';
import { alpha, colors, radius, spacing, themedStyles } from '@/theme';
import { call112 } from './call';

/**
 * Türkiye'de polis, itfaiye, sağlık ve jandarma çağrıları 112 Acil Çağrı Merkezi'nde birleştirilmiştir
 * (kaynak: 112.gov.tr). Kartlar hizmet türünü anlatır, hepsi 112'yi arar; ayrı numara uydurulmaz.
 */
const SERVICES: { key: string; title: string; icon: string; color: string }[] = [
  { key: 'polis', title: 'Polis', icon: 'mci:car-emergency', color: '#2F7CF6' },
  { key: 'itfaiye', title: 'İtfaiye', icon: 'mci:fire-truck', color: '#E5484D' },
  { key: 'saglik', title: 'Sağlık', icon: 'mci:ambulance', color: '#12A37F' },
];
const AFAD_URL = 'https://www.afad.gov.tr';

const TOOLS = [
  { key: 'enkaz', title: 'Enkaz Altı Modu', sub: 'İnternetsiz siren ve flaş', icon: 'megaphone', color: '#FF4B55', href: '/enkaz' },
  { key: 'fener', title: 'Fener', sub: 'Cihazınızın fenerini açın', icon: 'flashlight', color: '#F7B548', href: '/isik?led=1' },
  { key: 'sms', title: 'Acil SMS', sub: 'Hazır mesajlarla yardım isteyin', icon: 'chatbox-ellipses', color: '#4DA3FF', href: '/acil-sms' },
  { key: 'toplanma', title: 'Toplanma Alanları', sub: 'Yakınınızdaki güvenli alanlar', icon: 'people', color: '#4DA3FF', href: '/harita' },
] as const;

const GUIDE: { id: string; title: string; sub: string; img: GuideImgKey }[] = [
  { id: 'during-indoor', title: 'Deprem anında ne yapmalıyım?', sub: 'Çök · Kapan · Tutun', img: 'drop-cover-hold-wide' },
  { id: 'after-first', title: 'Deprem sonrasında ne yapmalıyım?', sub: 'Güvenli şekilde hareket edin', img: 'after-quake-wide' },
  { id: 'trapped', title: 'Enkaz altında kaldım', sub: 'Sakin kalın, yardım sinyali verin', img: 'trapped-wide' },
  { id: 'during-outdoor', title: 'Dışarıdaysam', sub: 'Açık alanda güvenli şekilde bekleyin', img: 'outdoor-wide' },
  { id: 'during-vehicle', title: 'Araçtaysam', sub: 'Yolu kapatmadan sağa yanaşıp durun', img: 'vehicle-wide' },
];

function SectionHead({ title, sub, onAll }: { title: string; sub?: string; onAll: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionBar} />
      <View style={{ flex: 1 }}>
        <AppText variant="heading" accessibilityRole="header" style={{ fontSize: 18 }}>
          {title}
        </AppText>
        {sub ? (
          <AppText variant="caption" style={{ fontSize: 12.5 }}>
            {sub}
          </AppText>
        ) : null}
      </View>
      <Pressable onPress={onAll} accessibilityRole="link" accessibilityLabel={`${title}: tümünü gör`} hitSlop={8} style={styles.all}>
        <AppText variant="label" color={colors.primary} style={{ fontSize: 13 }}>
          Tümünü gör
        </AppText>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/** Acil Durum sekmesi: önce 112 ve hızlı yardım, sonra araçlar ve kısa rehber (internetsiz). */
export function EmergencyHome({ bottomPad = 0 }: { bottomPad?: number }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { online } = useApp();
  const fam = useFamilyActions();
  const pageW = Math.min(width, 640);
  const gap = spacing.sm;
  const cellW = (pageW - spacing.md * 2 - gap * 3) / 4;
  const narrow = pageW < 360;

  const offlineInfo = () =>
    Alert.alert(
      online ? 'Çevrimdışı erişilebilir' : 'İnternet bağlantısı yok',
      '112 araması ve “Güvendeyim”/acil SMS’ler telefon şebekesiyle çalışır. Enkaz Altı Modu, fener ve acil durum rehberi internetsiz açılır.',
    );

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xs,
        paddingHorizontal: spacing.md,
        paddingBottom: bottomPad + spacing.xl,
        gap: spacing.sm + 4,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
      }}
    >
      {/* Üst bilgi */}
      <View style={styles.header}>
        <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="GÜVENDE, Acil Durum">
          <GuideImage img="logo" style={{ width: 30, height: 33 }} />
          <View style={{ flexShrink: 1 }}>
            <AppText variant="title" numberOfLines={1} style={{ fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: 0.3 }}>
              GÜVENDE
            </AppText>
            <AppText variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
              Acil Durum
            </AppText>
          </View>
        </View>
        <Pressable
          onPress={offlineInfo}
          accessibilityRole="button"
          accessibilityLabel={online ? 'Çevrimdışı erişilebilir' : 'İnternet yok'}
          style={({ pressed }) => [
            styles.offline,
            !online && { borderColor: colors.warning, backgroundColor: alpha(colors.warning, 0.08) },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name={online ? 'cloud-download-outline' : 'cloud-offline-outline'}
            size={16}
            color={online ? colors.safe : colors.warning}
          />
          {narrow ? null : (
            <AppText
              variant="label"
              numberOfLines={1}
              color={online ? colors.safe : colors.warning}
              style={{ fontSize: 11, fontWeight: '600', flexShrink: 1 }}
            >
              {online ? 'Çevrimdışı erişilebilir' : 'İnternet yok'}
            </AppText>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push('/rehber/kaynaklar')}
          accessibilityRole="button"
          accessibilityLabel="Bilgi ve kaynaklar"
          hitSlop={8}
          style={styles.info}
        >
          <Ionicons name="information-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* 112 */}
      <Pressable
        onPress={call112}
        accessibilityRole="button"
        accessibilityLabel="112 Acil Çağrı. Hemen arayın. Polis, itfaiye, sağlık ve AFAD"
        accessibilityHint="Telefonun arama ekranını açar"
        style={({ pressed }) => [styles.sos, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient colors={['#E8323F', '#B0141F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.sosIcon, narrow && { width: 48, height: 48, borderRadius: 14 }]}>
          <Ionicons name="call" size={narrow ? 24 : 36} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="display" color="#fff" numberOfLines={1} style={{ fontSize: narrow ? 18 : 25, lineHeight: narrow ? 23 : 30 }}>
            Acil Durum
          </AppText>
          <AppText variant="heading" color="#fff" numberOfLines={1} style={{ fontSize: narrow ? 12.5 : 16 }}>
            Hemen arayın
          </AppText>
          <AppText variant="caption" color="#FFD9DC" numberOfLines={1} style={{ fontSize: narrow ? 9 : 10.5 }}>
            Polis · İtfaiye · Sağlık · AFAD
          </AppText>
        </View>
        <AppText variant="display" color="#fff" style={{ fontSize: narrow ? 34 : 46, lineHeight: narrow ? 40 : 52, fontWeight: '800' }}>
          112
        </AppText>
        {narrow ? null : (
          <View style={styles.sosChev}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </View>
        )}
      </Pressable>

      {/* Hizmet kartları */}
      <View style={{ flexDirection: 'row', gap }}>
        {SERVICES.map((s) => (
          <Pressable
            key={s.key}
            onPress={call112}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}: 112'yi ara`}
            style={({ pressed }) => [
              styles.service,
              { width: cellW, borderColor: alpha(s.color, 0.7), backgroundColor: alpha(s.color, 0.14) },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name={s.icon} size={narrow ? 28 : 34} color={s.color} />
            <AppText variant="heading" numberOfLines={1} style={{ fontSize: narrow ? 12 : 13.5 }}>
              {s.title}
            </AppText>
            <View style={styles.serviceFoot}>
              <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ fontSize: narrow ? 9.5 : 10.5, flex: 1 }}>
                112 ile
              </AppText>
              <Ionicons name="call" size={14} color={colors.text} />
            </View>
          </Pressable>
        ))}
        <Pressable
          onPress={() => Linking.openURL(AFAD_URL).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel="AFAD resmî internet sitesi. Acil yardım için 112'yi arayın"
          style={({ pressed }) => [
            styles.service,
            { width: cellW, borderColor: alpha('#F08C2E', 0.7), backgroundColor: alpha('#F08C2E', 0.14) },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="mci:shield-alert" size={narrow ? 28 : 34} color="#F08C2E" />
          <AppText variant="heading" numberOfLines={1} style={{ fontSize: narrow ? 12 : 13.5 }}>
            AFAD
          </AppText>
          <View style={styles.serviceFoot}>
            <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ fontSize: narrow ? 9.5 : 10.5, flex: 1 }}>
              {narrow ? 'Site' : 'Resmî site'}
            </AppText>
            <Ionicons name="open-outline" size={13} color={colors.text} />
          </View>
        </Pressable>
      </View>

      {/* Konumumu paylaş */}
      <View style={[styles.share, narrow && { flexWrap: 'wrap' }]}>
        <View style={styles.shareIcon}>
          <Ionicons name="location" size={26} color="#FF4B55" />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: narrow ? 180 : 0 }}>
          <AppText variant="heading" style={{ fontSize: 15 }}>
            Konumumu paylaş
          </AppText>
          <AppText variant="caption" style={{ fontSize: 11.5, lineHeight: 15 }}>
            Yalnızca siz başlatırsınız; gönderilecek mesajı önce görürsünüz.
          </AppText>
        </View>
        <Pressable
          onPress={fam.shareLocation}
          accessibilityRole="button"
          accessibilityLabel="Konum paylaş"
          style={({ pressed }) => [styles.shareBtn, narrow && { flexGrow: 1, justifyContent: 'center' }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <AppText variant="label" color="#fff" style={{ fontWeight: '700', fontSize: 12.5 }}>
            Konum Paylaş
          </AppText>
        </Pressable>
      </View>

      {/* Acil Durum Araçları */}
      <SectionHead title="Acil Durum Araçları" onAll={() => router.push('/acil-araclar')} />
      <View style={{ flexDirection: 'row', gap }}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => router.push(t.href)}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}. ${t.sub}`}
            style={({ pressed }) => [styles.tool, { width: cellW }, narrow && { padding: 6 }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={t.icon} size={narrow ? 26 : 32} color={t.color} />
            <AppText variant="heading" style={{ fontSize: narrow ? 10.5 : 13, lineHeight: narrow ? 13 : 16 }}>
              {t.title}
            </AppText>
            <AppText variant="caption" style={{ fontSize: narrow ? 9.5 : 10.5, lineHeight: narrow ? 12 : 13.5 }}>
              {t.sub}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Acil Durum Rehberi */}
      <SectionHead title="Acil Durum Rehberi" sub="Duruma göre ne yapmanız gerektiğini öğrenin." onAll={() => router.push('/rehber')} />
      <View style={{ gap }}>
        {GUIDE.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => router.push({ pathname: '/rehber/[id]', params: { id: g.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${g.title}. ${g.sub}`}
            style={({ pressed }) => [styles.guide, pressed && { opacity: 0.88 }]}
          >
            <View style={{ width: pageW * 0.36, alignSelf: 'stretch' }}>
              <GuideImage img={g.img} style={{ width: '100%', height: '100%' }} cover />
              <EdgeFade color={colors.surface} size={28} />
            </View>
            <View style={{ flex: 1, gap: 3, paddingVertical: spacing.sm }}>
              <AppText variant="heading" style={{ fontSize: 14 }}>
                {g.title}
              </AppText>
              <AppText variant="caption" style={{ fontSize: 12 }}>
                {g.sub}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginRight: spacing.md }} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: alpha(colors.safe, 0.75),
    backgroundColor: alpha(colors.safe, 0.08),
    flexShrink: 1,
  },
  info: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 104,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF5B66',
    boxShadow: '0 8px 26px rgba(232,50,63,0.35)',
  },
  sosIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#FF4F5B', alignItems: 'center', justifyContent: 'center' },
  sosChev: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF3B4E', alignItems: 'center', justifyContent: 'center' },
  service: { minHeight: 92, borderRadius: 16, borderWidth: 1.5, padding: spacing.sm, gap: 4, justifyContent: 'space-between' },
  serviceFoot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: alpha('#FF4B55', 0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionBar: { width: 5, alignSelf: 'stretch', minHeight: 24, borderRadius: 3, backgroundColor: colors.danger },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  tool: {
    minHeight: 118,
    borderRadius: 16,
    padding: spacing.sm,
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
}));
