import type { EarthquakeEvent } from '../../types/earthquake';
import type { UserReport } from '../../types/report';
import { distanceKm } from '../../utils/geo';

/**
 * "Resmî kayıtla uyumlu": sarsıntı/hasar bildiriminin zamanında ve yakınında AFAD veya Kandilli'nin
 * bir deprem kaydı var mı? Bu yalnızca bağlam bilgisidir; bildirimin içeriğini (ör. hasarı) DOĞRULAMAZ
 * ve topluluk onayından bağımsızdır.
 */
const OFFICIAL = new Set(['afad', 'kandilli']);
const WINDOW_MIN: Partial<Record<UserReport['category'], number>> = { shake: 30, damage: 24 * 60 };

/** Kabaca hissedilme yarıçapı (km): M3 ≈ 20, M4 ≈ 40, M5 ≈ 80, M6 ≈ 160; en fazla 400 km. */
export const feltRadiusKm = (m: number) => Math.min(400, 20 * 2 ** (m - 3));

export function matchOfficialQuake(
  report: Pick<UserReport, 'category' | 'createdAt' | 'latitude' | 'longitude'>,
  events: EarthquakeEvent[],
): EarthquakeEvent | null {
  const windowMin = WINDOW_MIN[report.category];
  if (!windowMin || report.latitude == null || report.longitude == null) return null;
  const t = Date.parse(report.createdAt);
  const at = { latitude: report.latitude, longitude: report.longitude };
  let best: EarthquakeEvent | null = null;
  for (const e of events) {
    const official = e.readings.find((r) => OFFICIAL.has(r.source) && r.magnitude != null);
    if (!official) continue;
    const dt = t - Date.parse(official.occurredAt);
    if (dt < -60_000 || dt > windowMin * 60_000) continue;
    if (distanceKm(at, official) > feltRadiusKm(official.magnitude!)) continue;
    if (!best || (official.magnitude ?? 0) > (best.primary.magnitude ?? 0)) best = e;
  }
  return best;
}
