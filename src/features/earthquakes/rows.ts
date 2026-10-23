import type { QuakeSourceId, ReviewStatus, SourceReading } from '../../types/earthquake';

/** earthquake_readings satırı (Supabase). Sayısal sütunlar PostgREST'ten metin olarak da gelebilir. */
export interface ReadingRow {
  source: string;
  source_event_id: string;
  magnitude: number | string | null;
  magnitude_type: string | null;
  latitude: number;
  longitude: number;
  depth_km: number | string | null;
  occurred_at: string;
  source_updated_at: string | null;
  fetched_at: string;
  place: string | null;
  url: string | null;
  review_status: string;
}

export const READING_COLUMNS =
  'source, source_event_id, magnitude, magnitude_type, latitude, longitude, depth_km, occurred_at, source_updated_at, fetched_at, place, url, review_status';

const SOURCES: QuakeSourceId[] = ['afad', 'kandilli', 'usgs', 'emsc'];
const num = (v: number | string | null) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const iso = (v: string | null) => (v && Number.isFinite(Date.parse(v)) ? new Date(Date.parse(v)).toISOString() : null);

/** Satırı uygulama okumasına çevirir; tanınmayan kaynak veya bozuk zaman/koordinat atlanır (null). */
export function rowToReading(r: ReadingRow): SourceReading | null {
  if (!SOURCES.includes(r.source as QuakeSourceId)) return null;
  const occurredAt = iso(r.occurred_at);
  if (!occurredAt || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return null;
  return {
    source: r.source as QuakeSourceId,
    sourceEventId: r.source_event_id,
    magnitude: num(r.magnitude),
    magnitudeType: r.magnitude_type,
    latitude: r.latitude,
    longitude: r.longitude,
    depthKm: num(r.depth_km),
    occurredAt,
    sourceUpdatedAt: iso(r.source_updated_at),
    fetchedAt: iso(r.fetched_at) ?? occurredAt,
    place: r.place,
    url: r.url,
    reviewStatus: (['reviewed', 'automatic', 'unknown'].includes(r.review_status) ? r.review_status : 'unknown') as ReviewStatus,
  };
}

export function readingToRow(r: SourceReading, now: string) {
  return {
    source: r.source,
    source_event_id: r.sourceEventId,
    magnitude: r.magnitude,
    magnitude_type: r.magnitudeType,
    latitude: r.latitude,
    longitude: r.longitude,
    depth_km: r.depthKm,
    occurred_at: r.occurredAt,
    source_updated_at: r.sourceUpdatedAt,
    fetched_at: r.fetchedAt,
    place: r.place,
    url: r.url,
    review_status: r.reviewStatus,
    updated_at: now,
  };
}
