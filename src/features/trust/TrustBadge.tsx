import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, themedStyles } from '@/theme';
import type { UserReport } from '@/types/report';
import { VERIFY_THRESHOLD } from './rules';

/** Bildirimin güven düzeyi: Resmî kurum hesabı · Topluluk destekli (en az 3 yakın kişi; resmî doğrulama DEĞİLDİR) · Kullanıcı bildirimi. */
export function trustMeta(r: Pick<UserReport, 'verification' | 'authorOrg' | 'confirmCount'>) {
  if (r.verification === 'official')
    return { label: r.authorOrg ? `Resmî kurum · ${r.authorOrg}` : 'Resmî kurum', color: colors.primary, icon: 'checkmark-circle' as const };
  if (r.verification === 'community')
    return { label: `Topluluk destekli · ${r.confirmCount} onay`, color: colors.safe, icon: 'shield-checkmark' as const };
  return {
    label: r.confirmCount > 0 ? `Kullanıcı Bildirimi · ${r.confirmCount}/${VERIFY_THRESHOLD} onay` : 'Kullanıcı Bildirimi',
    color: colors.caution,
    icon: 'time-outline' as const,
  };
}

export function TrustBadge({
  report,
  compact,
}: {
  report: Pick<UserReport, 'verification' | 'authorOrg' | 'confirmCount'>;
  compact?: boolean;
}) {
  const m = trustMeta(report);
  return (
    <View style={[styles.badge, { borderColor: m.color + '88', backgroundColor: m.color + '1F' }]} accessibilityLabel={m.label}>
      <Ionicons name={m.icon} size={compact ? 11 : 13} color={m.color} />
      <AppText variant="caption" color={m.color} numberOfLines={1} style={{ fontSize: compact ? 9.5 : 10.5, fontWeight: '700' }}>
        {m.label}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    flexShrink: 1,
  },
}));
