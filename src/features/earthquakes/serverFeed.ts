import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuakeSourceId, SourceHealth, SourceReading } from '../../types/earthquake';
import { mergeReadings } from './merge';
import type { CachedSnapshot, QuakeSnapshot } from './repository';
import { READING_COLUMNS, rowToReading, type ReadingRow } from './rows';

/**
 * Deprem verisini GÜVENDE sunucusundan (Supabase) okur. Kaynakları yalnızca sunucu sorgular;
 * cihazlar veritabanını okur ve Realtime ile güncellenir.
 */
export const FEED_DAYS = 7;
/** Sunucu senkronu 2 dk'da bir çalışır; bundan uzun süre başarı yoksa veri "eski" sayılır. */
export const STALE_AFTER_MS = 10 * 60_000;

export interface SyncRow {
  source: string;
  status: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_event_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
}

export function healthFromSync(rows: SyncRow[], readings: SourceReading[], sources: QuakeSourceId[], now = Date.now()): SourceHealth[] {
  return sources.map((id) => {
    const r = rows.find((x) => x.source === id);
    const fresh = !!r?.last_success_at && now - Date.parse(r.last_success_at) < STALE_AFTER_MS;
    const ok = !!r && (r.status === 'ok' || r.status === 'schema_changed') && fresh;
    return {
      source: id,
      ok,
      lastAttemptAt: r?.last_attempt_at ?? null,
      lastSuccessAt: r?.last_success_at ?? null,
      lastEventAt: r?.last_event_at ?? null,
      error: !r
        ? 'Sunucu bu kaynağı henüz senkronize etmedi'
        : r.status === 'error'
          ? (r.last_error ?? 'Kaynağa ulaşılamadı')
          : r.status === 'schema_changed'
            ? 'Kaynak yanıt biçimi değişmiş olabilir'
            : !fresh
              ? 'Senkron gecikti'
              : null,
      count: readings.filter((x) => x.source === id).length,
    };
  });
}

export function buildServerSnapshot(readings: SourceReading[], rows: SyncRow[], sources: QuakeSourceId[], now = Date.now()): QuakeSnapshot {
  const health = healthFromSync(rows, readings, sources, now);
  const times = rows
    .filter((r) => sources.includes(r.source as QuakeSourceId))
    .map((r) => r.last_success_at)
    .filter((t): t is string => !!t)
    .sort();
  const lastSuccessAt = times.at(-1) ?? null;
  const stale = !lastSuccessAt || now - Date.parse(lastSuccessAt) > STALE_AFTER_MS;
  return { events: mergeReadings(readings), health, lastSuccessAt, stale, via: 'server' };
}

/** Sunucu bu sürede yanıt vermezse istek iptal edilir; uygulama sonsuza dek "yükleniyor"da kalmaz. */
export const SERVER_TIMEOUT_MS = 12_000;

export async function fetchServerReadings(sb: SupabaseClient, sources: QuakeSourceId[], minMagnitude = 1.5, timeoutMs = SERVER_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await queryServer(sb, sources, minMagnitude, ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function queryServer(sb: SupabaseClient, sources: QuakeSourceId[], minMagnitude: number, signal: AbortSignal) {
  const since = new Date(Date.now() - FEED_DAYS * 24 * 3600_000).toISOString();
  const [readingsRes, syncRes] = await Promise.all([
    sb
      .from('earthquake_readings')
      .select(READING_COLUMNS)
      .in('source', sources)
      .gte('occurred_at', since)
      .gte('magnitude', minMagnitude)
      .order('occurred_at', { ascending: false })
      .limit(2000)
      .abortSignal(signal),
    sb
      .from('quake_sync_state')
      .select('source, status, last_attempt_at, last_success_at, last_event_at, last_error, consecutive_failures')
      .abortSignal(signal),
  ]);
  if (readingsRes.error) throw readingsRes.error;
  if (syncRes.error) throw syncRes.error;
  const readings = ((readingsRes.data ?? []) as ReadingRow[]).map(rowToReading).filter((r): r is SourceReading => !!r);
  return { readings, sync: (syncRes.data ?? []) as SyncRow[] };
}

/** Realtime ile gelen okumayı listeye ekler/değiştirir (aynı kaynak + olay kimliği tekrarlanmaz). */
export function upsertReading(list: SourceReading[], r: SourceReading): SourceReading[] {
  const i = list.findIndex((x) => x.source === r.source && x.sourceEventId === r.sourceEventId);
  if (i < 0) return [r, ...list];
  const next = list.slice();
  next[i] = r;
  return next;
}

export function upsertSync(rows: SyncRow[], row: SyncRow): SyncRow[] {
  return [...rows.filter((r) => r.source !== row.source), row];
}

/**
 * Açılışta yeni veri gelene kadar cihazdaki son listeyi göstermek için. Yaşı korunur: son başarılı
 * senkron 10 dakikadan eskiyse "güncel değil" olarak işaretlenir (eski veri yeni gibi sunulmaz).
 */
export function snapshotFromCache(cache: CachedSnapshot, sources: QuakeSourceId[], now = Date.now()): QuakeSnapshot | null {
  const readings = cache.readings.filter((r) => sources.includes(r.source));
  if (!readings.length) return null;
  const lastSuccessAt =
    cache.health
      .map((h) => h.lastSuccessAt)
      .filter((t): t is string => !!t)
      .sort()
      .at(-1) ?? null;
  const stale = !lastSuccessAt || now - Date.parse(lastSuccessAt) > STALE_AFTER_MS;
  return { events: mergeReadings(readings), health: cache.health, lastSuccessAt, stale, via: 'cache' };
}
