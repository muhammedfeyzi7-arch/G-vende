import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { GuideArt } from './Art';
import { QUICK_LINKS } from './content';
import { openGuideTarget } from './ui';

/**
 * Ana sayfadaki "ACİL DURUM" kartı: deprem anında en kritik bilgiye tek dokunuşla ulaşım.
 * İçerik uygulamaya gömülüdür; internet, giriş veya ödeme gerektirmez.
 */
export function EmergencyGuideCard() {
  return (
    <View style={styles.card}>
      <LinearGradient colors={['#D7263D', '#9E1529']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.head}>
        <View style={styles.badge}>
          <Ionicons name="warning" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" color="#fff" style={{ fontSize: 19, letterSpacing: 1 }} accessibilityRole="header">
            ACİL DURUM
          </AppText>
          <AppText variant="caption" color="#FFE3E3">
            Ne yapmalıyım? · İnternetsiz çalışır · Resmî kaynaklı
          </AppText>
        </View>
      </LinearGradient>

      <View style={styles.list}>
        {QUICK_LINKS.map((q, i) => (
          <Pressable
            key={q.label}
            onPress={() => openGuideTarget(q.target)}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.thumb, { borderColor: q.tone }]}>
              <GuideArt id={q.art} width={58} />
            </View>
            <AppText variant="label" color={colors.text} style={{ flex: 1, fontSize: 15, fontWeight: '700' }}>
              {q.label}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => router.push('/rehber')} accessibilityRole="link" style={styles.all}>
        <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
          Tüm acil durum rehberi
        </AppText>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64, paddingVertical: spacing.xs },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  thumb: { borderRadius: 10, borderWidth: 2, overflow: 'hidden' },
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
