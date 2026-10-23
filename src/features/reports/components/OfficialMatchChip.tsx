import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { formatMagnitude } from '@/features/earthquakes/format.core';
import { useAppOptional } from '@/providers/AppProvider';
import { colors, themedStyles } from '@/theme';
import type { UserReport } from '@/types/report';
import { matchOfficialQuake } from '../officialMatch';

const LABEL: Record<string, string> = { afad: 'AFAD', kandilli: 'Kandilli' };

/** Bildirimin zamanında ve yakınında resmî deprem kaydı varsa gösterir. Bildirimin içeriğini doğrulamaz. */
export function OfficialMatchChip({ report, detailed }: { report: UserReport; detailed?: boolean }) {
  const events = useAppOptional()?.quakes.snapshot?.events;
  const match = useMemo(() => matchOfficialQuake(report, events ?? []), [report, events]);
  if (!match) return null;
  const src = match.readings.find((r) => r.source === 'afad' || r.source === 'kandilli')!;
  const label = `${LABEL[src.source]} kaydıyla uyumlu · M${formatMagnitude(src.magnitude)}`;
  return (
    <View style={{ gap: 2 }}>
      <View style={styles.chip} accessibilityLabel={label}>
        <Ionicons name="pulse" size={detailed ? 13 : 11} color={colors.primary} />
        <AppText variant="caption" color={colors.primary} style={{ fontSize: detailed ? 10.5 : 9.5, fontWeight: '700' }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      {detailed ? (
        <AppText variant="caption">
          Bu bildirimin zamanında ve yakınında {LABEL[src.source]} bir deprem kaydetti. Bu yalnızca bağlam bilgisidir; bildirimin içeriğini
          doğrulamaz.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderColor: colors.primary + '88',
    backgroundColor: colors.primary + '1A',
  },
}));
