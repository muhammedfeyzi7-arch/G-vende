import type { SourceReading } from '@/types/earthquake';
import { isValidCoordinate } from '@/utils/geo';
import { SourceError, type QuakeSource } from './types';

/**
 * USGS FDSN Event Web Service (belgelenmiş, kamu malı veri).
 * https://earthquake.usgs.gov/fdsnws/event/1/
 */
const BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

type UsgsFeature = {
  id?: string;
  properties?: {
    mag?: number | null;
    magType?: string | null;
    place?: string | null;
    time?: number;
    updated?: number;
    url?: string;
    status?: string;
  };
  geometry?: { coordinates?: [number, number, number?] };
};

export function parseUsgs(body: string, fetchedAt: string): SourceReading[] {
  let data: { features?: UsgsFeature[] };
  try {
    data = JSON.parse(body);
  } catch {
    throw new SourceError('usgs', 'USGS yanıtı JSON değil');
  }
  if (!data || !Array.isArray(data.features)) throw new SourceError('usgs', 'USGS yanıtı GeoJSON değil');
  const out: SourceReading[] = [];
  for (const f of data.features) {
    const [lon, lat, depth] = f.geometry?.coordinates ?? [];
    const p = f.properties ?? {};
    if (!f.id || !isValidCoordinate(lat, lon) || typeof p.time !== 'number') continue;
    out.push({
      source: 'usgs',
      sourceEventId: f.id,
      magnitude: typeof p.mag === 'number' ? p.mag : null,
      magnitudeType: p.magType ?? null,
      latitude: lat as number,
      longitude: lon as number,
      depthKm: typeof depth === 'number' ? depth : null,
      occurredAt: new Date(p.time).toISOString(),
      sourceUpdatedAt: typeof p.updated === 'number' ? new Date(p.updated).toISOString() : null,
      fetchedAt,
      place: p.place ?? null,
      url: p.url ?? null,
      reviewStatus: p.status === 'reviewed' ? 'reviewed' : p.status === 'automatic' ? 'automatic' : 'unknown',
    });
  }
  return out;
}

export const usgsSource: QuakeSource = {
  id: 'usgs',
  label: 'USGS',
  attribution: 'U.S. Geological Survey (kamu malı veri)',
  homepage: 'https://earthquake.usgs.gov/earthquakes/map/',
  async fetch(q, fetcher) {
    const params = new URLSearchParams({
      format: 'geojson',
      starttime: q.since.toISOString(),
      endtime: q.until.toISOString(),
      minlatitude: String(q.bbox.minLat),
      maxlatitude: String(q.bbox.maxLat),
      minlongitude: String(q.bbox.minLon),
      maxlongitude: String(q.bbox.maxLon),
      minmagnitude: String(q.minMagnitude),
      orderby: 'time',
      limit: String(q.limit),
    });
    const res = await fetcher(`${BASE}?${params.toString()}`);
    if (!res.ok) throw new SourceError('usgs', `USGS HTTP ${res.status}`);
    return parseUsgs(await res.text(), new Date().toISOString());
  },
};
