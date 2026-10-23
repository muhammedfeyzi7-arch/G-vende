import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing, themedStyles } from '@/theme';
import { bearingDeg, compassDirTr, distanceKm, formatDistance, type LatLng } from '@/utils/geo';

const ARRIVED_KM = 0.05;

/**
 * Hedefe yönü gösteren pusula oku. Telefonun pusulası (manyetometre) varsa ok telefon döndükçe
 * hedefi gösterir; yoksa yalnızca yön adı yazılır. İnternet gerektirmez. Kuş uçuşu yöndür, yol değil.
 */
export function CompassToTarget({ from, target, label }: { from: LatLng; target: LatLng; label: string }) {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchHeadingAsync((h) => {
      const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      setHeading(v);
      setAccuracy(h.accuracy);
    })
      .then((s) => (cancelled ? s.remove() : (sub = s)))
      .catch(() => setHeading(null));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const bearing = bearingDeg(from, target);
  const km = distanceKm(from, target);
  const arrived = km < ARRIVED_KM;
  const rotation = heading == null ? bearing : bearing - heading;
  // iOS 0–3, Android 0–3: düşük doğrulukta kalibrasyon önerilir.
  const lowAccuracy = heading != null && accuracy != null && accuracy < 2 && Platform.OS === 'android';

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={arrived ? `${label}: vardınız` : `${label}: ${compassDirTr(bearing)} yönünde, kuş uçuşu ${formatDistance(km)}`}
    >
      <View style={styles.dial}>
        {heading != null ? (
          <AppText variant="caption" style={[styles.north, { transform: [{ rotate: `${-heading}deg` }] }]}>
            K
          </AppText>
        ) : (
          <AppText variant="caption" style={styles.north}>
            K
          </AppText>
        )}
        {arrived ? (
          <Ionicons name="checkmark-circle" size={54} color={colors.safe} />
        ) : (
          <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
            <Ionicons name="navigate" size={54} color={colors.safe} style={{ transform: [{ rotate: '-45deg' }] }} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" style={{ fontSize: 15 }}>
          {arrived ? 'Vardınız' : `${compassDirTr(bearing)} · ${formatDistance(km)}`}
        </AppText>
        <AppText variant="caption">
          {arrived
            ? `${label} çevresindesiniz.`
            : heading != null
              ? 'Ok, telefonu düz tuttuğunuzda alanı gösterir. Kuş uçuşu yöndür; güvenli yolu izleyin.'
              : 'Pusula kullanılamıyor; yön kuzeye göre gösteriliyor. Kuş uçuşu yöndür.'}
        </AppText>
        {lowAccuracy ? (
          <AppText variant="caption" color={colors.warning}>
            Pusula doğruluğu düşük: telefonu havada 8 çizerek kalibre edin.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.safe + '14',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.safe + '55',
  },
  dial: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.safe + '66',
  },
  north: { position: 'absolute', top: 2, fontWeight: '800', color: colors.danger },
}));
