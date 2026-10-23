import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, hitSlop, radius, spacing, themedStyles } from '@/theme';
import type { EarthquakeEvent } from '@/types/earthquake';
import { distanceKm, formatDistance, type LatLng } from '@/utils/geo';
import { relativeTimeTr } from '@/utils/time';
import { formatDepth, formatMagnitude, magnitudeColor, placeTitle } from '../format';
import { SOURCES } from '../repository';

function Metric({
  icon,
  label,
  value,
  onPress,
  trailing,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  trailing?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={styles.metric}
    >
      <View style={styles.metricIcon}>
        <Ionicons name={icon as never} size={19} color={colors.text} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText variant="caption" numberOfLines={1} style={{ fontSize: 10 }}>
          {label}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText variant="heading" numberOfLines={1} style={{ fontSize: 13 }}>
            {value}
          </AppText>
          {trailing ? <Ionicons name={trailing as never} size={14} color={colors.primary} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Harita altındaki deprem özeti. "Hissedilen şiddet" ölçülmediği için gösterilmez; yerine
 * olay sonrası 150 km içinde paylaşılan kullanıcı bildirimi sayısı (doğrulanmamış) verilir.
 */
export function QuakeSummaryCard({ event, user, feltReports }: { event: EarthquakeEvent; user: LatLng | null; feltReports: number }) {
  const p = event.primary;
  const c = magnitudeColor(p.magnitude);
  const [copied, setCopied] = useState(false);
  const coords = `${p.latitude.toFixed(4)}° K, ${p.longitude.toFixed(4)}° D`;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Ionicons name="pulse" size={34} color={c} style={{ textShadowColor: c, textShadowRadius: 10 }} />
        <View>
          <AppText variant="display" style={{ fontSize: 23, lineHeight: 26.5 }}>
            M {formatMagnitude(p.magnitude)}
          </AppText>
          <AppText variant="caption" color={colors.danger}>
            {relativeTimeTr(p.occurredAt)}
          </AppText>
        </View>
        <View style={styles.vsep} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" numberOfLines={1} style={{ fontSize: 13 }}>
            {placeTitle(event)}
          </AppText>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(`${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`Koordinatları kopyala: ${coords}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <AppText variant="caption" numberOfLines={1} style={{ fontSize: 10.5 }}>
              {copied ? 'Kopyalandı' : coords}
            </AppText>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={13} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/deprem/[id]', params: { id: event.id } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.detailBtn, pressed && { opacity: 0.85 }]}
        >
          <AppText variant="label" color={colors.text} style={{ fontSize: 11.5 }}>
            Detaylar
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.metrics}>
        <Metric icon="time-outline" label="Derinlik" value={formatDepth(p.depthKm)} />
        <Metric icon="navigate-outline" label="Sana uzaklığı" value={user ? formatDistance(distanceKm(user, p)) : 'Bilinmiyor'} />
        <Metric icon="chatbubbles-outline" label="Bildirimler" value={`${feltReports}`} />
        <Metric
          icon="business-outline"
          label="Kaynak"
          value={SOURCES[p.source].label}
          trailing={p.url ? 'open-outline' : undefined}
          onPress={p.url ? () => Linking.openURL(p.url!) : undefined}
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.md,
    boxShadow: colors.shadowSoft,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vsep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.borderStrong, marginHorizontal: 2 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 36,
  },
  metrics: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 4,
  },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  metricIcon: { width: 20, alignItems: 'center', justifyContent: 'center' },
}));
