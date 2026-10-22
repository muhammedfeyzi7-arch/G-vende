import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { formatDistance } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';
import type { AlertState } from '../alertState';
import { formatMagnitude, placeTitle, sourceLabel } from '../format';

type Props = {
  state: AlertState;
  loading: boolean;
  error: string | null;
  onPress?: () => void;
};

/**
 * Üst durum kartı. Kırmızı görünüm yalnızca kaynakta yayımlanmış, yakın ve yeni bir olay
 * varken kullanılır. Kart deprem "algılamaz"; yayımlanmış kayıtları özetler.
 */
export function AlertCard({ state, loading, error, onPress }: Props) {
  const alert = state.kind === 'recent-significant';
  const event = state.kind === 'none' ? null : state.event;

  let title: string;
  let subtitle: string;
  if (alert) {
    title = state.distanceKm != null && state.distanceKm < 100 ? 'Yakınınızda deprem kaydedildi' : 'Önemli deprem kaydedildi';
    subtitle = 'Artçı sarsıntılar olabilir, güvenli konumda kalın.';
  } else if (event) {
    title = 'Son depremler ve bölgesel durum';
    subtitle = `Son kayıt: ${placeTitle(event)} · ${relativeTimeTr(event.primary.occurredAt)}`;
  } else if (loading) {
    title = 'Deprem verileri yükleniyor';
    subtitle = 'AFAD, Kandilli ve USGS kayıtları alınıyor…';
  } else if (error) {
    title = 'Deprem verisi alınamadı';
    subtitle = error;
  } else {
    title = 'Son depremler ve bölgesel durum';
    subtitle = 'Seçili dönemde kayıt bulunmuyor.';
  }

  const a11y = event
    ? `${title}. ${placeTitle(event)}, büyüklük ${formatMagnitude(event.primary.magnitude)}, ${relativeTimeTr(event.primary.occurredAt)}.` +
      (state.kind !== 'none' && state.distanceKm != null ? ` Size uzaklığı ${formatDistance(state.distanceKm)}.` : '')
    : title;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={a11y}
      accessibilityLiveRegion={alert ? 'assertive' : 'polite'}
      style={({ pressed }) => [styles.card, alert ? styles.cardAlert : styles.cardCalm, pressed && { opacity: 0.9 }]}
    >
      <Ionicons name="pulse" size={40} color={alert ? colors.danger : colors.primary} style={styles.wave} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" numberOfLines={2} style={{ fontSize: 19 }}>
          {title}
        </AppText>
        <AppText variant="label" numberOfLines={2} color={alert ? '#F6C9CE' : colors.textSecondary}>
          {subtitle}
        </AppText>
      </View>
      {event ? (
        <View style={[styles.magBox, { borderColor: alert ? colors.danger + 'AA' : colors.borderStrong }]}>
          <AppText variant="caption" color={alert ? '#F6C9CE' : colors.textSecondary}>
            Büyüklük
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="display" style={{ fontSize: 30 }}>
              {formatMagnitude(event.primary.magnitude)}
            </AppText>
            <Ionicons name="pulse" size={16} color={alert ? colors.danger : colors.primary} />
          </View>
          <AppText variant="caption" color={alert ? '#F6C9CE' : colors.textMuted}>
            {event.primary.magnitudeType ?? 'tür ?'} · {sourceLabel(event.primary)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  cardAlert: { backgroundColor: colors.dangerSurface, borderColor: colors.dangerBorder },
  cardCalm: { backgroundColor: colors.surface, borderColor: colors.border },
  wave: { marginRight: -2 },
  magBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 96,
  },
});
