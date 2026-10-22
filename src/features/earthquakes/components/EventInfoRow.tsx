import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, hitSlop, spacing } from '@/theme';
import type { EarthquakeEvent } from '@/types/earthquake';
import { distanceKm, formatDistance, type LatLng } from '@/utils/geo';
import { formatTimeTr, relativeTimeTr } from '@/utils/time';
import { formatDepth, placeTitle } from '../format';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICON = 18;

function Item({
  icon,
  label,
  value,
  sub,
  flex = 1,
  lines = 1,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  flex?: number;
  lines?: number;
}) {
  return (
    <View style={[styles.item, { flex }]} accessible accessibilityLabel={`${label} ${value} ${sub ?? ''}`}>
      <Ionicons name={icon} size={ICON} color={colors.text} style={{ marginTop: 2 }} />
      <View style={{ flexShrink: 1 }}>
        <AppText variant="caption" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="heading" numberOfLines={lines} style={styles.value}>
          {value}
        </AppText>
        {sub ? (
          <AppText variant="caption" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function EventInfoRow({ event, user, locationHint }: { event: EarthquakeEvent; user: LatLng | null; locationHint?: string }) {
  const d = user ? distanceKm(user, event.primary) : null;
  return (
    <View style={styles.row}>
      <Item
        icon="time-outline"
        label="Zaman"
        value={formatTimeTr(event.primary.occurredAt)}
        sub={relativeTimeTr(event.primary.occurredAt)}
        flex={1}
      />
      <Item icon="location-outline" label="Merkez" value={placeTitle(event)} flex={1.15} lines={2} />
      <Item icon="locate-outline" label="Derinlik" value={formatDepth(event.primary.depthKm)} flex={0.85} />
      <Pressable
        style={[styles.item, { flex: 1 }]}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`Size uzaklık ${formatDistance(d)}`}
        accessibilityHint="Uzaklığın nasıl hesaplandığını açıklar"
        onPress={() =>
          Alert.alert(
            'Uzaklık nasıl hesaplanır?',
            d == null
              ? 'Konumunuz bilinmediği için uzaklık hesaplanamadı. Konum izni verebilir veya Ayarlar’dan ilinizi seçebilirsiniz.'
              : `Kaynağın bildirdiği merkez üssü ile ${locationHint ?? 'konumunuz'} arasındaki kuş uçuşu mesafedir. Sarsıntı şiddetini göstermez.`,
          )
        }
      >
        <Ionicons name="navigate-outline" size={ICON} color={colors.text} style={{ marginTop: 2 }} />
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppText variant="caption" numberOfLines={1}>
              Uzaklık
            </AppText>
            <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
          </View>
          <AppText variant="heading" numberOfLines={1} style={styles.value}>
            {formatDistance(d)}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  item: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' },
  value: { fontSize: 15 },
});
