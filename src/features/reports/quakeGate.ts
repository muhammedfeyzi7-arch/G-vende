import type { EarthquakeEvent, SourceReading } from '../../types/earthquake';
import type { LatLng } from '../../utils/geo';
import { distanceKm } from '../../utils/geo';
import { feltRadiusKm } from './officialMatch';

/**
 * Herkese açık olay bildirimi yalnızca bölgede yakın zamanda resmî kayıtlı bir deprem olduysa açılır.
 * Sunucudaki `has_recent_quake_near` kuralının aynısıdır (asıl denetim sunucudadır; bu yalnızca arayüz için):
 * AFAD veya Kandilli, M ≥ 4.0, son 72 saat, hissedilme yarıçapı içinde. Aile SMS'i bu kurala bağlı değildir.
 */
export const GATE_MIN_MAGNITUDE = 4.0;
export const GATE_WINDOW_HOURS = 72;
const OFFICIAL = new Set(['afad', 'kandilli']);

export interface GateQuake {
  event: EarthquakeEvent;
  reading: SourceReading;
  distanceKm: number;
}

export function findGateQuake(point: LatLng | null, events: EarthquakeEvent[], now = Date.now()): GateQuake | null {
  if (!point) return null;
  let best: GateQuake | null = null;
  for (const event of events) {
    for (const r of event.readings) {
      if (!OFFICIAL.has(r.source) || r.magnitude == null || r.magnitude < GATE_MIN_MAGNITUDE) continue;
      const age = now - Date.parse(r.occurredAt);
      if (age < -5 * 60_000 || age > GATE_WINDOW_HOURS * 3600_000) continue;
      const d = distanceKm(point, r);
      if (d > feltRadiusKm(r.magnitude)) continue;
      if (!best || r.magnitude > best.reading.magnitude!) best = { event, reading: r, distanceKm: d };
    }
  }
  return best;
}
