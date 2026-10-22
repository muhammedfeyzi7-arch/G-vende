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

function Item({ icon, label, value, sub, flex = 1 }: { icon: IconName; label?: string; value: string; sub?: string; flex?: number }) {
  return (
    <View style={[styles.item, { flex }]} accessible accessibilityLabel={`${label ?? ''} ${value} ${sub ?? ''}`}>
      <Ionicons name={icon} size={22} color={colors.text} style={{ marginTop: 2 }} />
      <View style={{ flexShrink: 1 }}>
        {label ? <AppText variant="caption">{label}</AppText> : null}
        <AppText variant="heading" numberOfLines={2} style={{ fontSize: 16 }}>
          {value}
        </AppText>
        {sub ? <AppText variant="caption" numberOfLines={1}>{sub}</AppText> : null}
      </View>
    </View>
  );
}

export function EventInfoRow({ event, user, locationHint }: { event: EarthquakeEvent; user: LatLng | null; locationHint?: string }) {
  const d = user ? distanceKm(user, event.primary) : null;
  return (
    <View style={styles.row}>
      <Item icon="time-outline" value={formatTimeTr(event.primary.occurredAt)} sub={relativeTimeTr(event.primary.occurredAt)} />
      <Item icon="location-outline" label="Merkez üssü" value={placeTitle(event)} flex={1.5} />
      <Item icon="locate-outline" label="Derinlik" value={formatDepth(event.primary.depthKm)} />
      <View style={[styles.item, { flex: 1.1 }]}>
        <Ionicons name="navigate-outline" size={22} color={colors.text} style={{ marginTop: 2 }} />
        <View style={{ flexShrink: 1 }}>
          <AppText variant="caption">Sana uzaklığı</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="heading" style={{ fontSize: 16 }}>
              {formatDistance(d)}
            </AppText>
            <Pressable
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Uzaklık hesabı hakkında"
              onPress={() =>
                Alert.alert(
                  'Uzaklık nasıl hesaplanır?',
                  d == null
                    ? 'Konumunuz bilinmediği için uzaklık hesaplanamadı. Konum izni verebilir veya Ayarlar’dan ilinizi seçebilirsiniz.'
                    : `Kaynağın bildirdiği merkez üssü ile ${locationHint ?? 'konumunuz'} arasındaki kuş uçuşu mesafedir. Sarsıntı şiddetini göstermez.`,
                )
              }
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  item: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
});
