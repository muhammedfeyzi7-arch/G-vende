import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Pill } from '@/components/ui';
import { colors, hitSlop, radius, spacing } from '@/theme';
import type { UserReport } from '@/types/report';
import { relativeTimeTr } from '@/utils/time';
import { CATEGORY_META, feltColor, reportHeadline } from '../categories';

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
      accessibilityLabel={`${meta.label}. ${area}. ${headline} ${report.description ?? ''}. ${time}. ${report.helpfulCount} kişi faydalı buldu.`}
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
        {report.isSample || report.verification !== 'unverified' ? (
          <View style={styles.badges}>
            {report.isSample ? <Pill label="ÖRNEK VERİ" color={colors.warning} /> : null}
            {report.verification === 'official' ? <Pill label="Yetkili doğruladı" color={colors.safe} /> : null}
            {report.verification === 'community' ? <Pill label="Topluluk teyitli" color={colors.primary} /> : null}
          </View>
        ) : null}
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
          <AppText variant="label" style={{ fontSize: 15 }}>
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
  area: { fontSize: 13 },
  headline: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 14, lineHeight: 19 },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  side: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  time: { fontSize: 13 },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingLeft: 6 },
});
