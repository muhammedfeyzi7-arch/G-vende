import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Pill } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { UserReport } from '@/types/report';
import { relativeTimeTr } from '@/utils/time';
import { CATEGORY_META, feltColor, reportHeadline } from '../categories';

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
      accessibilityLabel={`${meta.label}. ${title} ${report.areaLabel ?? ''}. ${relativeTimeTr(report.createdAt)}. Doğrulanmamış kullanıcı bildirimi.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.icon, { backgroundColor: color + '33' }]}>
            <Ionicons name={meta.icon} size={16} color={color} />
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
          <Ionicons name="thumbs-up-outline" size={15} color={colors.textSecondary} />
          <AppText variant="caption">{report.helpfulCount}</AppText>
          {report.isSample ? <Pill label="ÖRNEK" color={colors.warning} /> : null}
        </View>
      </View>
      {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 76, height: 92, borderRadius: radius.md, backgroundColor: colors.surface },
});
