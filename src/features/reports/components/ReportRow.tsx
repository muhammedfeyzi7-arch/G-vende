import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Pill } from '@/components/ui';
import { colors, hitSlop, radius, spacing } from '@/theme';
import type { UserReport } from '@/types/report';
import { relativeTimeTr } from '@/utils/time';
import { CATEGORY_META, feltColor, reportHeadline } from '../categories';
import { TrustBadge, trustMeta } from '@/features/trust/TrustBadge';

export function ReportRow({
  report,
  helpful,
  onPress,
  onHelpful,
}: {
  report: UserReport;
  helpful: boolean;
  onPress: () => void;
  onHelpful: () => void;
}) {
  const meta = CATEGORY_META[report.category];
  const iconColor = report.category === 'shake' ? feltColor(report.feltIntensity) : meta.color;
  const thumb = report.media[0]?.url;
  const headline = reportHeadline(report.category, report.feltIntensity);
  const time = relativeTimeTr(report.createdAt);
  const area = report.areaLabel ?? 'Bölge belirtilmemiş';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}. ${area}. ${headline} ${report.description ?? ''}. ${trustMeta(report).label}. ${time}. ${report.helpfulCount} kişi faydalı buldu.`}
      // Satır tek erişilebilir öğe olduğundan iç düğme ekran okuyucuya eylem olarak sunulur.
      accessibilityActions={[{ name: 'activate' }, { name: 'helpful', label: helpful ? 'Faydalı işaretini kaldır' : 'Faydalı buldum' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'helpful' ? onHelpful() : onPress())}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <View style={[styles.icon, { backgroundColor: iconColor, boxShadow: `0 0 14px ${iconColor}55` }]}>
        <Ionicons name={meta.icon} size={22} color={report.category === 'help' ? '#3A2A00' : '#fff'} />
      </View>
      {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={1} style={styles.area}>
          {area}
        </AppText>
        <AppText variant="heading" numberOfLines={2} style={styles.headline}>
          {headline}
        </AppText>
        {report.description && report.description.trim() !== headline ? (
          <AppText variant="label" numberOfLines={2} style={styles.desc}>
            {report.description}
          </AppText>
        ) : null}
        <View style={styles.badges}>
          <TrustBadge report={report} compact />
          {report.isSample ? <Pill label="ÖRNEK VERİ" color={colors.warning} /> : null}
        </View>
      </View>
      <View style={styles.side}>
        <AppText variant="label" style={styles.time}>
          {time}
        </AppText>
        <Pressable
          onPress={onHelpful}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={helpful ? 'Faydalı işaretini kaldır' : 'Faydalı buldum'}
          accessibilityState={{ selected: helpful }}
          style={styles.helpful}
        >
          <Ionicons name={helpful ? 'heart' : 'heart-outline'} size={21} color={helpful ? colors.danger : colors.textSecondary} />
          <AppText variant="label" style={{ fontSize: 13 }}>
            {report.helpfulCount}
          </AppText>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 66, height: 66, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  body: { flex: 1, gap: 2 },
  area: { fontSize: 11.5 },
  headline: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12.5, lineHeight: 16.5 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  side: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  time: { fontSize: 11.5 },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingLeft: 6 },
});
