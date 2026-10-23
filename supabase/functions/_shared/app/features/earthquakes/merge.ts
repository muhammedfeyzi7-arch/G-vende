// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/features/earthquakes/merge.ts (scripts/sync-function-shared.mjs)
import type { EarthquakeEvent, QuakeSourceId, SourceReading } from '../../types/earthquake.ts';
import { distanceKm } from '../../utils/geo.ts';

/** Ekranda birincil gösterilecek kaynak sırası (resmî ulusal kurum önce). */
export const SOURCE_PRIORITY: QuakeSourceId[] = ['afad', 'kandilli', 'emsc', 'usgs'];

export const MATCH_WINDOW_SECONDS = 60;
export const MATCH_DISTANCE_KM = 60;
/** Büyüklükler bu kadar farklıysa (her ikisi de biliniyorsa) aynı olay sayılmaz. */
export const MATCH_MAX_MAG_DIFF = 1.0;

export function readingsMatch(a: SourceReading, b: SourceReading): boolean {
  if (a.source === b.source) return a.sourceEventId === b.sourceEventId;
  const dt = Math.abs(Date.parse(a.occurredAt) - Date.parse(b.occurredAt)) / 1000;
  if (dt > MATCH_WINDOW_SECONDS) return false;
  if (distanceKm(a, b) > MATCH_DISTANCE_KM) return false;
  if (a.magnitude != null && b.magnitude != null && Math.abs(a.magnitude - b.magnitude) > MATCH_MAX_MAG_DIFF) return false;
  return true;
}

const priority = (s: QuakeSourceId) => SOURCE_PRIORITY.indexOf(s);

/** Eşleşme puanı: düşük daha iyi (zaman + mesafe birlikte). */
const matchScore = (a: SourceReading, b: SourceReading) =>
  Math.abs(Date.parse(a.occurredAt) - Date.parse(b.occurredAt)) / 1000 / MATCH_WINDOW_SECONDS + distanceKm(a, b) / MATCH_DISTANCE_KM;

/**
 * Farklı kaynaklardan gelen okumaları aynı olay altında toplar.
 * Her olay her kaynaktan en fazla bir okuma içerir; özgün değerler değiştirilmez.
 */
export function mergeReadings(all: SourceReading[]): EarthquakeEvent[] {
  // Aynı kaynak + kimlik tekrarlarını tekilleştir (en güncel okumayı koru).
  const unique = new Map<string, SourceReading>();
  for (const r of all) {
    const key = `${r.source}:${r.sourceEventId}`;
    const prev = unique.get(key);
    if (!prev || (r.sourceUpdatedAt ?? r.fetchedAt) > (prev.sourceUpdatedAt ?? prev.fetchedAt)) unique.set(key, r);
  }

  // Öncelikli kaynaklar önce kümeleri başlatır; sonra diğerleri en iyi eşleşen kümeye katılır.
  const sorted = [...unique.values()].sort(
    (a, b) => priority(a.source) - priority(b.source) || Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
  const clusters: SourceReading[][] = [];
  for (const r of sorted) {
    let best: SourceReading[] | null = null;
    let bestScore = Infinity;
    for (const c of clusters) {
      if (c.some((x) => x.source === r.source)) continue;
      const anchor = c[0]!;
      if (!readingsMatch(anchor, r)) continue;
      const s = matchScore(anchor, r);
      if (s < bestScore) {
        best = c;
        bestScore = s;
      }
    }
    if (best) best.push(r);
    else clusters.push([r]);
  }

  return clusters
    .map((readings) => {
      const primary = readings[0]!;
      return { id: `${primary.source}:${primary.sourceEventId}`, primary, readings };
    })
    .sort((a, b) => Date.parse(b.primary.occurredAt) - Date.parse(a.primary.occurredAt));
}
