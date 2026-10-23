import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Pill } from '@/components/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';
import type { UserReport } from '@/types/report';
import { relativeTimeTr } from '@/utils/time';
import { CATEGORY_META, feltColor, reportHeadline } from '../categories';
import { TrustBadge, trustMeta } from '@/features/trust/TrustBadge';

/** Ana sayfadaki yatay "Son Bildirimler" kartı. */
export function ReportCard({ report, onPress }: { report: UserReport; onPress: () => void }) {
  const meta = CATEGORY_META[report.category];
  const color = report.category === 'shake' ? feltColor(report.feltIntensity) : meta.color;
  const thumb = report.media[0]?.url;
  const title = reportHeadline(report.category, report.feltIntensity);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}. ${title} ${report.areaLabel ?? ''}. ${relativeTimeTr(report.createdAt)}. ${trustMeta(report).label}.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.icon, { backgroundColor: color, boxShadow: `0 0 10px ${color}88` }]}>
            <Ionicons name={meta.icon} size={14} color={report.category === 'help' ? '#3A2A00' : '#fff'} />
          </View>
          <AppText variant="caption" numberOfLines={1}>
            {relativeTimeTr(report.createdAt)}
          </AppText>
        </View>
        <AppText variant="heading" numberOfLines={2} style={{ fontSize: 13 }}>
          {title}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {report.areaLabel ?? 'Bölge belirtilmemiş'}
        </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
          <Ionicons name="thumbs-up-outline" size={14} color={colors.textSecondary} />
          <AppText variant="caption">{report.helpfulCount}</AppText>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          <AppText variant="caption">{report.confirmCount}</AppText>
          {report.isSample ? <Pill label="ÖRNEK" color={colors.warning} /> : null}
        </View>
      </View>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
      ) : (
        // Fotoğrafsız bildirimde kategori simgeli degrade kutu (referanstaki görsel alanı korunur).
        <View style={[styles.thumb, { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}>
          <LinearGradient colors={[color + '55', color + '12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name={meta.icon} size={30} color={color} />
        </View>
      )}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  card: {
    width: 236,
    minHeight: 120,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    boxShadow: colors.shadowSoft,
  },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 76, height: 92, borderRadius: radius.md, backgroundColor: colors.surface },
}));
