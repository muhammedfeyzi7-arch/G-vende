import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    title = 'Deprem kaydedildi';
    subtitle = `${state.minutesAgo <= 1 ? 'Az önce' : `${state.minutesAgo} dk önce`} · Artçılar olabilir, güvenli konumda kalın.`;
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

  const accent = alert ? colors.danger : colors.primary;
  const soft = alert ? '#F3C3C9' : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={a11y}
      accessibilityLiveRegion={alert ? 'assertive' : 'polite'}
      style={({ pressed }) => [styles.shell, alert ? styles.shellAlert : styles.shellCalm, pressed && { opacity: 0.92 }]}
    >
      <LinearGradient
        colors={alert ? ['#55101C', '#3A0C15', '#2A0911'] : ['#0D1D2D', '#081522']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="pulse" size={44} color={accent} style={[styles.wave, { textShadowColor: accent + 'CC' }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="title" numberOfLines={alert ? 1 : 2} style={{ fontSize: alert ? 19 : 17, letterSpacing: -0.2 }}>
          {title}
        </AppText>
        <AppText variant="label" numberOfLines={2} color={soft} style={{ fontSize: 13 }}>
          {subtitle}
        </AppText>
      </View>
      {event ? (
        <View style={[styles.magBox, { borderColor: alert ? colors.danger + 'B3' : colors.borderStrong }]}>
          <AppText variant="caption" color={soft} style={{ fontSize: 11 }}>
            Büyüklük {event.primary.magnitudeType ? `(${event.primary.magnitudeType})` : ''}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="display" style={{ fontSize: 28, lineHeight: 32 }}>
              {formatMagnitude(event.primary.magnitude)}
            </AppText>
            <Ionicons name="pulse" size={16} color={accent} />
          </View>
          <AppText variant="caption" color={alert ? '#F3C3C9' : colors.textMuted} style={{ fontSize: 10 }}>
            {sourceLabel(event.primary)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    overflow: 'hidden',
  },
  shellAlert: { borderColor: '#7A1C2A', boxShadow: '0 6px 22px rgba(255,53,72,0.22)' },
  shellCalm: { borderColor: colors.border },
  wave: { marginRight: -2, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  magBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 92,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});
