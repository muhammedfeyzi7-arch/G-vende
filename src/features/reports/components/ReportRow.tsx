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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}. ${report.areaLabel ?? 'Bölge belirtilmemiş'}. ${headline} ${report.description ?? ''}. ${relativeTimeTr(report.createdAt)}. ${report.helpfulCount} kişi faydalı buldu.`}
      // Satır tek erişilebilir öğe olduğundan iç düğme ekran okuyucuya eylem olarak sunulur.
      accessibilityActions={[{ name: 'activate' }, { name: 'helpful', label: helpful ? 'Faydalı işaretini kaldır' : 'Faydalı buldum' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'helpful' ? onHelpful() : onPress())}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <View style={[styles.icon, { backgroundColor: iconColor }]}>
        <Ionicons name={meta.icon} size={22} color={report.category === 'help' ? '#3A2A00' : '#fff'} />
      </View>
      {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.metaLine}>
          <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
            {report.areaLabel ?? 'Bölge belirtilmemiş'}
          </AppText>
          <AppText variant="label">{relativeTimeTr(report.createdAt)}</AppText>
        </View>
        <AppText variant="heading" numberOfLines={2} style={{ fontSize: 16 }}>
          {headline}
        </AppText>
        {report.description && report.description.trim() !== headline ? (
          <AppText variant="label" numberOfLines={2}>
            {report.description}
          </AppText>
        ) : null}
        <View style={styles.footer}>
          {report.isSample ? <Pill label="ÖRNEK VERİ" color={colors.warning} /> : null}
          {report.verification === 'official' ? (
            <Pill label="Yetkili doğruladı" color={colors.safe} />
          ) : report.verification === 'community' ? (
            <Pill label="Topluluk teyitli" color={colors.primary} />
          ) : (
            <Pill label="Doğrulanmadı" color={colors.textMuted} />
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onHelpful}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={helpful ? 'Faydalı işaretini kaldır' : 'Faydalı buldum'}
            accessibilityState={{ selected: helpful }}
            style={styles.helpful}
          >
            <Ionicons name={helpful ? 'heart' : 'heart-outline'} size={20} color={helpful ? colors.danger : colors.textSecondary} />
            <AppText variant="label">{report.helpfulCount}</AppText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  thumb: { width: 70, height: 70, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  metaLine: { flexDirection: 'row', gap: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 4 },
});
