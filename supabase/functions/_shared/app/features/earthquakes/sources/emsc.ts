// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/features/earthquakes/sources/emsc.ts (scripts/sync-function-shared.mjs)
import type { SourceReading } from '../../../types/earthquake.ts';
import { isValidCoordinate } from '../../../utils/geo.ts';
import { SourceError, type QuakeSource } from './types.ts';

/**
 * EMSC (Avrupa-Akdeniz Sismoloji Merkezi) FDSN olay servisi — belgelenmiş, herkese açık.
 * https://www.seismicportal.eu/fdsn-wsevent.html  · Zamanlar UTC'dir.
 */
const BASE = 'https://www.seismicportal.eu/fdsnws/event/1/query';

type EmscFeature = {
  id?: string;
  properties?: {
    unid?: string;
    time?: string;
    lastupdate?: string;
    lat?: number;
    lon?: number;
    depth?: number | null;
    mag?: number | null;
    magtype?: string | null;
    flynn_region?: string | null;
    evtype?: string | null;
  };
};

const iso = (v: string | null | undefined) => {
  if (!v) return null;
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/** Flinn-Engdahl bölge adlarının Türkçesi (sık görülenler); diğerleri yalnızca büyük/küçük harf düzeltilir. */
const REGION_TR: Record<string, string> = {
  'WESTERN TURKEY': 'Batı Türkiye',
  'CENTRAL TURKEY': 'Orta Türkiye',
  'EASTERN TURKEY': 'Doğu Türkiye',
  TURKEY: 'Türkiye',
  'SEA OF MARMARA': 'Marmara Denizi',
  'AEGEAN SEA': 'Ege Denizi',
  'BLACK SEA': 'Karadeniz',
  'EASTERN MEDITERRANEAN SEA': 'Doğu Akdeniz',
  'CYPRUS REGION': 'Kıbrıs bölgesi',
  'TURKEY-SYRIA BORDER REGION': 'Türkiye-Suriye sınır bölgesi',
  'TURKEY-IRAN BORDER REGION': 'Türkiye-İran sınır bölgesi',
  'DODECANESE ISLANDS, GREECE': 'Onikiadalar, Yunanistan',
  GREECE: 'Yunanistan',
  'NORTHWESTERN IRAN': 'Kuzeybatı İran',
  'CAUCASUS REGION, RUSSIA': 'Kafkasya',
  ARMENIA: 'Ermenistan',
  GEORGIA: 'Gürcistan',
  BULGARIA: 'Bulgaristan',
  SYRIA: 'Suriye',
};
const region = (s: string | null | undefined) => {
  if (!s) return null;
  const k = s.trim().toUpperCase();
  return REGION_TR[k] ?? k.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
};

export function parseEmsc(body: string, fetchedAt: string): SourceReading[] {
  let data: { features?: EmscFeature[] };
  try {
    data = JSON.parse(body);
  } catch {
    throw new SourceError('emsc', 'EMSC yanıtı JSON değil');
  }
  if (!data || !Array.isArray(data.features)) throw new SourceError('emsc', 'EMSC yanıtı GeoJSON değil');
  const out: SourceReading[] = [];
  for (const f of data.features) {
    const p = f.properties ?? {};
    const id = p.unid ?? f.id;
    const occurredAt = iso(p.time);
    // Yalnızca deprem kayıtları ("ke" = known earthquake); patlama/taş ocağı vb. alınmaz.
    if (!id || !occurredAt || !isValidCoordinate(p.lat, p.lon) || (p.evtype && p.evtype !== 'ke')) continue;
    out.push({
      source: 'emsc',
      sourceEventId: id,
      magnitude: typeof p.mag === 'number' ? p.mag : null,
      magnitudeType: p.magtype ? (p.magtype.toLowerCase() === 'mw' ? 'Mw' : p.magtype.toUpperCase()) : null,
      latitude: p.lat as number,
      longitude: p.lon as number,
      depthKm: typeof p.depth === 'number' ? p.depth : null,
      occurredAt,
      sourceUpdatedAt: iso(p.lastupdate),
      fetchedAt,
      place: region(p.flynn_region),
      url: `https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(id)}`,
      reviewStatus: 'unknown',
    });
  }
  return out;
}

export const emscSource: QuakeSource = {
  id: 'emsc',
  label: 'EMSC',
  attribution: 'Avrupa-Akdeniz Sismoloji Merkezi (EMSC-CSEM)',
  homepage: 'https://www.emsc-csem.org/',
  async fetch(q, fetcher) {
    const params = new URLSearchParams({
      format: 'json',
      start: q.since.toISOString().slice(0, 19),
      end: q.until.toISOString().slice(0, 19),
      minlat: String(q.bbox.minLat),
      maxlat: String(q.bbox.maxLat),
      minlon: String(q.bbox.minLon),
      maxlon: String(q.bbox.maxLon),
      minmag: String(q.minMagnitude),
      orderby: 'time',
      limit: String(q.limit),
    });
    const res = await fetcher(`${BASE}?${params.toString()}`, { headers: { Accept: 'application/json' } });
    // FDSN: veri yoksa 204 döner.
    if (res.status === 204) return [];
    if (!res.ok) throw new SourceError('emsc', `EMSC HTTP ${res.status}`);
    return parseEmsc(await res.text(), new Date().toISOString());
  },
};
