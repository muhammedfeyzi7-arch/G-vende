import type { SourceReading } from '@/types/earthquake';
import { isValidCoordinate } from '@/utils/geo';
import { SourceError, type QuakeSource } from './types';

/**
 * AFAD Deprem Dairesi olay servisi (deprem.afad.gov.tr/apiv2/event/filter).
 *
 * Not: Bu uç nokta AFAD'ın kendi web arayüzünün kullandığı herkese açık servistir;
 * belgelenmiş bir kamu API sözleşmesi veya yazılı kullanım şartı bulunamamıştır.
 * Yayına almadan önce AFAD ile kullanım izni teyit edilmelidir. `date` alanı UTC'dir.
 */
const BASE = 'https://deprem.afad.gov.tr/apiv2/event/filter';

type AfadEvent = {
  eventID?: string | number;
  location?: string;
  latitude?: string | number;
  longitude?: string | number;
  depth?: string | number;
  type?: string;
  magnitude?: string | number;
  province?: string;
  district?: string;
  date?: string;
  isEventUpdate?: boolean;
  lastUpdateDate?: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');
/** AFAD filtreleri UTC ve saniye çözünürlüğünde, saat dilimi eki olmadan bekler. */
export function afadDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(
    d.getUTCMinutes(),
  )}:${pad(d.getUTCSeconds())}`;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function utcIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function parseAfad(body: string, fetchedAt: string): SourceReading[] {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new SourceError('afad', 'AFAD yanıtı JSON değil');
  }
  if (!Array.isArray(data)) throw new SourceError('afad', 'AFAD yanıtı beklenen liste biçiminde değil');
  const out: SourceReading[] = [];
  for (const raw of data as AfadEvent[]) {
    const lat = num(raw.latitude);
    const lon = num(raw.longitude);
    const occurredAt = utcIso(raw.date);
    if (raw.eventID == null || !isValidCoordinate(lat, lon) || !occurredAt) continue;
    const id = String(raw.eventID);
    out.push({
      source: 'afad',
      sourceEventId: id,
      magnitude: num(raw.magnitude),
      magnitudeType: raw.type?.trim() || null,
      latitude: lat as number,
      longitude: lon as number,
      depthKm: num(raw.depth),
      occurredAt,
      sourceUpdatedAt: utcIso(raw.lastUpdateDate ?? null),
      fetchedAt,
      place: raw.location?.trim() || [raw.district, raw.province].filter(Boolean).join(', ') || null,
      url: `https://deprem.afad.gov.tr/event-detail/${encodeURIComponent(id)}`,
      // AFAD revizyon bilgisini yalnızca isEventUpdate ile veriyor; ilk yayın için durum belirsizdir.
      reviewStatus: raw.isEventUpdate ? 'reviewed' : 'unknown',
    });
  }
  return out;
}

export const afadSource: QuakeSource = {
  id: 'afad',
  label: 'AFAD',
  attribution: 'T.C. İçişleri Bakanlığı AFAD Deprem Dairesi Başkanlığı',
  homepage: 'https://deprem.afad.gov.tr/last-earthquakes',
  async fetch(q, fetcher) {
    const params = new URLSearchParams({
      start: afadDate(q.since),
      end: afadDate(q.until),
      minlat: String(q.bbox.minLat),
      maxlat: String(q.bbox.maxLat),
      minlon: String(q.bbox.minLon),
      maxlon: String(q.bbox.maxLon),
      minmag: String(q.minMagnitude),
      orderby: 'timedesc',
      limit: String(q.limit),
      format: 'json',
    });
    const res = await fetcher(`${BASE}?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new SourceError('afad', `AFAD HTTP ${res.status}`);
    return parseAfad(await res.text(), new Date().toISOString());
  },
};
