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

const ICON = 21;

function Item({
  icon,
  label,
  value,
  sub,
  flex = 1,
  lines = 1,
}: {
  icon: IconName;
  label?: string;
  value: string;
  sub?: string;
  flex?: number;
  lines?: number;
}) {
  return (
    <View style={[styles.item, { flex }]} accessible accessibilityLabel={`${label ?? 'Zaman'} ${value} ${sub ?? ''}`}>
      <Ionicons name={icon} size={ICON} color={colors.text} style={{ marginTop: 4 }} />
      <View style={{ flexShrink: 1 }}>
        {label ? (
          <AppText variant="caption" numberOfLines={1}>
            {label}
          </AppText>
        ) : null}
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
        value={formatTimeTr(event.primary.occurredAt)}
        sub={relativeTimeTr(event.primary.occurredAt)}
        flex={0.9}
      />
      <Item icon="location-outline" label="Merkez üssü" value={placeTitle(event)} flex={1.5} lines={2} />
      <Item icon="locate-outline" label="Derinlik" value={formatDepth(event.primary.depthKm)} flex={0.75} />
      <Pressable
        style={[styles.item, { flex: 1.05 }]}
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
        <Ionicons name="navigate-outline" size={ICON} color={colors.text} style={{ marginTop: 4 }} />
        <View style={{ flexShrink: 1 }}>
          <AppText variant="caption" numberOfLines={1}>
            Sana uzaklığı
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="heading" numberOfLines={1} style={styles.value}>
              {formatDistance(d)}
            </AppText>
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  item: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  value: { fontSize: 14, fontWeight: '700' },
});
