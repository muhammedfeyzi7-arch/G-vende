import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { EarthquakeEvent } from '@/types/earthquake';
import { distanceKm, formatDistance, type LatLng } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';
import { formatDepth, formatMagnitude, magnitudeColor, placeTitle } from '../format';
import { SOURCES } from '../repository';

export function QuakeListItem({ event, user, onPress }: { event: EarthquakeEvent; user: LatLng | null; onPress: () => void }) {
  const p = event.primary;
  const c = magnitudeColor(p.magnitude);
  const d = user ? distanceKm(user, p) : null;
  const sources = event.readings.map((r) => SOURCES[r.source].label).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Büyüklük ${formatMagnitude(p.magnitude)}, ${placeTitle(event)}, ${relativeTimeTr(p.occurredAt)}, derinlik ${formatDepth(p.depthKm)}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <View style={[styles.mag, { borderColor: c + '88', backgroundColor: c + '1F' }]}>
        <AppText variant="heading" color={c}>
          {formatMagnitude(p.magnitude)}
        </AppText>
        <AppText variant="caption" color={c} style={{ fontSize: 9 }}>
          {p.magnitudeType ?? '?'}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" numberOfLines={1} style={{ fontSize: 14 }}>
          {placeTitle(event)}
        </AppText>
        <AppText variant="label" numberOfLines={1}>
          Derinlik {formatDepth(p.depthKm)}
          {d != null ? ` · ${formatDistance(d)} uzakta` : ''}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          Kaynak: {sources}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText variant="caption">{relativeTimeTr(p.occurredAt)}</AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
  mag: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
