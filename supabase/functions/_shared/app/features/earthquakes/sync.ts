// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/features/earthquakes/sync.ts (scripts/sync-function-shared.mjs)
import type { QuakeSourceId, SourceReading } from '../../types/earthquake.ts';
import { SourceError } from './sources/types.ts';

/**
 * Sunucu senkronizasyonunun saf kuralları (ingest-earthquakes kullanır; birim testli).
 * - Her kaynak için yalnızca son başarılı çekimden bu yana (örtüşmeyle) olaylar istenir.
 * - Hata alan kaynak üstel bekleme ile ertelenir; son başarılı veriler silinmez.
 * - Yalnızca yeni veya değişmiş okumalar yazılır (gereksiz güncelleme ve Realtime trafiği olmaz).
 */
export interface SyncState {
  source: QuakeSourceId;
  last_attempt_at: string | null;
  last_success_at: string | null;
  /** Kaynaktan alınan en yeni olayın zamanı (kaynak zamanı). */
  last_event_at: string | null;
  consecutive_failures: number;
  next_attempt_at: string | null;
}

/** Kaynak sonradan revize edebileceği için son başarılı çekimden geriye doğru yeniden bakılan süre. */
export const OVERLAP_MS = 2 * 3600_000;
/** İlk çalıştırma veya uzun kesinti sonrası en fazla bu kadar geriye gidilir. */
export const MAX_LOOKBACK_MS = 24 * 3600_000;
export const MAX_BACKOFF_MIN = 60;

export function syncSince(state: Pick<SyncState, 'last_success_at'> | null, now: Date): Date {
  const floor = now.getTime() - MAX_LOOKBACK_MS;
  const last = state?.last_success_at ? Date.parse(state.last_success_at) - OVERLAP_MS : floor;
  return new Date(Math.max(floor, Math.min(last, now.getTime() - OVERLAP_MS)));
}

export function shouldAttempt(state: Pick<SyncState, 'next_attempt_at'> | null, now: Date): boolean {
  return !state?.next_attempt_at || Date.parse(state.next_attempt_at) <= now.getTime();
}

/** 1., 2., 3. ardışık hatadan sonra 1, 2, 4… dakika; en fazla 60 dk. */
export function backoffUntil(consecutiveFailures: number, now: Date): Date {
  const minutes = Math.min(MAX_BACKOFF_MIN, 2 ** Math.max(0, consecutiveFailures - 1));
  return new Date(now.getTime() + minutes * 60_000);
}

/** Ağ hatası, zaman aşımı, 429 ve 5xx yeniden denenir; bozuk yanıt ve diğer 4xx denenmez. */
export function isRetryable(e: unknown): boolean {
  if (e instanceof SourceError) return /HTTP (429|5\d\d)/.test(e.message);
  return true;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseMs ?? 1000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts - 1 || !isRetryable(e)) break;
      await sleep(base * 3 ** i);
    }
  }
  throw last;
}

/** Veritabanındaki satırın karşılaştırılan alanları. */
export interface StoredReading {
  source: string;
  source_event_id: string;
  magnitude: number | string | null;
  magnitude_type: string | null;
  latitude: number;
  longitude: number;
  depth_km: number | string | null;
  occurred_at: string;
  source_updated_at: string | null;
  place: string | null;
  review_status: string;
}

export const readingKey = (r: { source: string; sourceEventId?: string; source_event_id?: string }) =>
  `${r.source}:${r.sourceEventId ?? r.source_event_id}`;

const round = (v: number | string | null, d: number) => (v == null ? null : Number(Number(v).toFixed(d)));
const time = (v: string | null) => (v ? Date.parse(v) : null);

/** Veritabanında olmayan ya da kaynakta değişmiş okumaları döndürür (sütun hassasiyetine göre). */
export function changedReadings(incoming: SourceReading[], stored: Map<string, StoredReading>): SourceReading[] {
  return incoming.filter((r) => {
    const s = stored.get(readingKey(r));
    if (!s) return true;
    return (
      round(r.magnitude, 1) !== round(s.magnitude, 1) ||
      (r.magnitudeType ?? null) !== (s.magnitude_type ?? null) ||
      Math.abs(r.latitude - s.latitude) > 1e-6 ||
      Math.abs(r.longitude - s.longitude) > 1e-6 ||
      round(r.depthKm, 2) !== round(s.depth_km, 2) ||
      time(r.occurredAt) !== time(s.occurred_at) ||
      time(r.sourceUpdatedAt) !== time(s.source_updated_at) ||
      (r.place ?? null) !== (s.place ?? null) ||
      r.reviewStatus !== s.review_status
    );
  });
}

/** Ayrıştırıcının dayandığı alanlar; kaynağın gerçek yanıtında yoksa şema değişmiş demektir. */
export const REQUIRED_FIELDS: Partial<Record<QuakeSourceId, string[]>> = {
  afad: ['eventID', 'latitude', 'longitude', 'depth', 'magnitude', 'date'],
  emsc: ['unid', 'time', 'lat', 'lon', 'mag'],
  usgs: ['mag', 'time'],
};

/** Ham yanıttaki ilk kaydın alan adları (şema gözlemi için; değerler saklanmaz). */
export function sampleKeys(source: QuakeSourceId, body: string): string[] | null {
  try {
    const data = JSON.parse(body);
    const first = source === 'afad' ? data?.[0] : data?.features?.[0]?.properties;
    return first && typeof first === 'object' ? Object.keys(first).sort() : null;
  } catch {
    return null;
  }
}

export function missingFields(source: QuakeSourceId, keys: string[] | null): string[] {
  if (!keys) return [];
  return (REQUIRED_FIELDS[source] ?? []).filter((k) => !keys.includes(k));
}
