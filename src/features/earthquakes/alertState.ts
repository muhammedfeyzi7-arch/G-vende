import type { EarthquakeEvent } from '@/types/earthquake';
import { distanceKm, type LatLng } from '@/utils/geo';

export type AlertState =
  | { kind: 'none' }
  /** Yakın zamanda, kullanıcıya yakın ve en az bir kaynak tarafından yayımlanmış önemli olay. */
  | { kind: 'recent-significant'; event: EarthquakeEvent; distanceKm: number | null; minutesAgo: number }
  | { kind: 'latest'; event: EarthquakeEvent; distanceKm: number | null };

export const SIGNIFICANT_MAGNITUDE = 4.0;
export const RECENT_MINUTES = 30;
/** Konum bilinmiyorsa yalnızca bu büyüklüğün üzerindeki olaylar "önemli" sayılır. */
export const NATIONWIDE_MAGNITUDE = 5.0;

function relevanceRadiusKm(mag: number): number {
  // Kaba bir ilgi yarıçapı — "hissedilme sınırı" değildir, yalnızca uyarı kartını ne zaman göstereceğimizi belirler.
  if (mag >= 6) return 500;
  if (mag >= 5) return 300;
  return 150;
}

/**
 * Uyarı kartının durumunu belirler. Kart, ancak bir kaynak tarafından yayımlanmış gerçek bir
 * kayda dayanarak kırmızı duruma geçer; kendi başına "deprem oluyor" iddiasında bulunmaz.
 */
export function computeAlertState(events: EarthquakeEvent[], user: LatLng | null, now: Date = new Date()): AlertState {
  if (events.length === 0) return { kind: 'none' };
  const withMeta = events.map((e) => ({
    event: e,
    distanceKm: user ? distanceKm(user, e.primary) : null,
    minutesAgo: (now.getTime() - Date.parse(e.primary.occurredAt)) / 60000,
  }));

  const significant = withMeta.find(({ event, distanceKm: d, minutesAgo }) => {
    const m = event.primary.magnitude;
    if (m == null || minutesAgo < 0 || minutesAgo > RECENT_MINUTES) return false;
    if (d == null) return m >= NATIONWIDE_MAGNITUDE;
    return m >= SIGNIFICANT_MAGNITUDE && d <= relevanceRadiusKm(m);
  });
  if (significant) return { kind: 'recent-significant', ...significant, minutesAgo: Math.max(0, Math.floor(significant.minutesAgo)) };

  const latest = withMeta[0]!;
  return { kind: 'latest', event: latest.event, distanceKm: latest.distanceKm };
}
