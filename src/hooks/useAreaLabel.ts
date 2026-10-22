import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { PROVINCES } from '@/features/settings/provinces';
import { useApp } from '@/providers/AppProvider';
import { distanceKm } from '@/utils/geo';

/**
 * Kullanıcının bulunduğu yerin okunur adı ("Düzce · Merkez"). Yalnızca cihazda gösterilir.
 * GPS izni yoksa elle seçilen il; hiçbiri yoksa null.
 */
export function useAreaLabel(): { label: string | null; source: 'gps' | 'manual' | null } {
  const { location } = useApp();
  const [gpsLabel, setGpsLabel] = useState<string | null>(null);
  const lat = location.status === 'granted' ? Math.round(location.coords.latitude * 100) / 100 : null;
  const lon = location.status === 'granted' ? Math.round(location.coords.longitude * 100) / 100 : null;

  useEffect(() => {
    if (lat == null || lon == null) return;
    let alive = true;
    Location.reverseGeocodeAsync({ latitude: lat, longitude: lon })
      .then(([a]) => {
        if (!alive || !a) return;
        const parts = [a.region ?? a.city, a.subregion ?? a.district].filter((x): x is string => !!x);
        setGpsLabel([...new Set(parts)].join(' · ') || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [lat, lon]);

  if (location.status === 'granted') {
    if (gpsLabel) return { label: gpsLabel, source: 'gps' };
    // Ters coğrafi kodlama sonuç vermezse (çevrimdışı vb.) en yakın il merkezinin adı
    const nearest = PROVINCES.reduce((a, b) => (distanceKm(location.coords, a) <= distanceKm(location.coords, b) ? a : b));
    return { label: nearest.name, source: 'gps' };
  }
  if (location.status === 'manual') return { label: location.label.split(' (')[0] ?? null, source: 'manual' };
  return { label: null, source: null };
}
