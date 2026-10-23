import type { EarthquakeEvent, QuakeSourceId, SourceHealth, SourceReading } from '@/types/earthquake';
import { mergeReadings } from './merge';
import { afadSource } from './sources/afad';
import { emscSource } from './sources/emsc';
import { kandilliSource } from './sources/kandilli';
import { usgsSource } from './sources/usgs';
import { TURKEY_BBOX, type Fetcher, type QuakeQuery, type QuakeSource } from './sources/types';

export const SOURCES: Record<QuakeSourceId, QuakeSource> = {
  afad: afadSource,
  kandilli: kandilliSource,
  usgs: usgsSource,
  emsc: emscSource,
};

export interface QuakeSnapshot {
  events: EarthquakeEvent[];
  health: SourceHealth[];
  /** En az bir kaynağın başarıyla yanıt verdiği son zaman. */
  lastSuccessAt: string | null;
  /** Veriler önbellekten mi geliyor (hiçbir kaynak bu denemede yanıt vermedi)? */
  stale: boolean;
}

export interface CachedSnapshot {
  readings: SourceReading[];
  health: SourceHealth[];
}

export function defaultQuery(now = new Date()): QuakeQuery {
  return {
    since: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
    until: now,
    minMagnitude: 1.5,
    bbox: { ...TURKEY_BBOX },
    limit: 300,
  };
}

/**
 * Etkin kaynakları paralel sorgular. Başarısız kaynak için önbellekteki son okumalar
 * korunur ve sağlık durumu hata olarak işaretlenir; veri asla uydurulmaz.
 */
export async function loadEarthquakes(
  sourceIds: QuakeSourceId[],
  fetcher: Fetcher,
  cache: CachedSnapshot | null,
  query: QuakeQuery = defaultQuery(),
): Promise<{ snapshot: QuakeSnapshot; cache: CachedSnapshot }> {
  const attemptAt = new Date().toISOString();
  const results = await Promise.allSettled(sourceIds.map((id) => SOURCES[id].fetch(query, fetcher)));

  const readings: SourceReading[] = [];
  const health: SourceHealth[] = [];
  let anyOk = false;

  results.forEach((res, i) => {
    const id = sourceIds[i]!;
    const prev = cache?.health.find((h) => h.source === id);
    if (res.status === 'fulfilled') {
      anyOk = true;
      readings.push(...res.value);
      health.push({ source: id, ok: true, lastAttemptAt: attemptAt, lastSuccessAt: attemptAt, error: null, count: res.value.length });
    } else {
      const cached = cache?.readings.filter((r) => r.source === id) ?? [];
      readings.push(...cached);
      health.push({
        source: id,
        ok: false,
        lastAttemptAt: attemptAt,
        lastSuccessAt: prev?.lastSuccessAt ?? null,
        error: res.reason instanceof Error ? res.reason.message : 'Bilinmeyen hata',
        count: cached.length,
      });
    }
  });

  // Sorgu penceresinin dışına düşmüş eski önbellek kayıtlarını at.
  const since = query.since.getTime();
  const inWindow = readings.filter((r) => Date.parse(r.occurredAt) >= since);

  const successTimes = health.map((h) => h.lastSuccessAt).filter((t): t is string => !!t);
  const lastSuccessAt = successTimes.sort().at(-1) ?? null;
  return {
    snapshot: { events: mergeReadings(inWindow), health, lastSuccessAt, stale: !anyOk },
    cache: { readings: inWindow, health },
  };
}
