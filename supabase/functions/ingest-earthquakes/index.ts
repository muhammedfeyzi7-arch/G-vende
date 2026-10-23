// Zamanlanmış görev (pg_cron, 2 dakikada bir): deprem kaynaklarını sunucuda sorgular, yalnızca yeni veya
// değişmiş okumaları yazar, kaynak başına senkron durumunu tutar ve yeni olaylar için tercihe göre push gönderir.
// Mobil cihazlar kaynakları sürekli sorgulamaz; veritabanını okur ve Realtime ile güncellenir.
// Bu bir ERKEN UYARI sistemi değildir: bildirim, olay kaynakta yayımlandıktan sonra gider.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { mergeReadings } from '../_shared/app/features/earthquakes/merge.ts';
import { SOURCES, defaultQuery } from '../_shared/app/features/earthquakes/repository.ts';
import { READING_COLUMNS, readingToRow, rowToReading, type ReadingRow } from '../_shared/app/features/earthquakes/rows.ts';
import type { Fetcher } from '../_shared/app/features/earthquakes/sources/types.ts';
import {
  backoffUntil,
  changedReadings,
  missingFields,
  readingKey,
  sampleKeys,
  shouldAttempt,
  syncSince,
  withRetry,
  type StoredReading,
  type SyncState,
} from '../_shared/app/features/earthquakes/sync.ts';
import type { QuakeSourceId, SourceReading } from '../_shared/app/types/earthquake.ts';
import { quakePushContent } from '../_shared/quakeMessage.ts';
import { selectRecipients, sendExpoPush, type Pref } from '../_shared/recipients.ts';
import { serverSecret } from '../_shared/secrets.ts';

const ORDER: QuakeSourceId[] = ['afad', 'kandilli', 'emsc', 'usgs'];
const NOTIFY_WINDOW_MIN = 30;
const MIN_NOTIFY_MAGNITUDE = 3.0;
const TIMEOUT_MS = 15_000;

type SourceResult = { source: QuakeSourceId; ok: boolean; fetched: number; written: number; skipped?: boolean; error?: string };

async function syncSource(sb: SupabaseClient, id: QuakeSourceId, state: SyncState | null, now: Date): Promise<SourceResult> {
  if (!shouldAttempt(state, now)) return { source: id, ok: false, fetched: 0, written: 0, skipped: true };

  let body = '';
  const fetcher: Fetcher = async (url, init) => {
    const res = await fetch(url, { headers: init?.headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return {
      ok: res.ok,
      status: res.status,
      text: async () => (body = await res.text()),
      arrayBuffer: () => res.arrayBuffer(),
    };
  };
  const q = { ...defaultQuery(now), since: syncSince(state, now), until: now };

  try {
    const readings = await withRetry(() => SOURCES[id].fetch(q, fetcher));
    const keys = sampleKeys(id, body);
    const missing = missingFields(id, keys);

    // Yalnızca yeni/değişmiş okumalar yazılır; aynı kaynak+olay kimliği tekrar eklenmez (birincil anahtar).
    const stored = new Map<string, StoredReading>();
    const ids = readings.map((r) => r.sourceEventId);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await sb
        .from('earthquake_readings')
        .select('source, source_event_id, magnitude, magnitude_type, latitude, longitude, depth_km, occurred_at, source_updated_at, place, review_status')
        .eq('source', id)
        .in('source_event_id', ids.slice(i, i + 200));
      if (error) throw new Error(`Veritabanı okunamadı: ${error.message}`);
      for (const s of (data ?? []) as StoredReading[]) stored.set(readingKey(s), s);
    }
    const changed = changedReadings(readings, stored);
    if (changed.length) {
      const { error } = await sb.from('earthquake_readings').upsert(changed.map((r) => readingToRow(r, now.toISOString())));
      if (error) throw new Error(`Veritabanına yazılamadı: ${error.message}`);
    }

    const newest = readings.reduce<string | null>((m, r) => (!m || r.occurredAt > m ? r.occurredAt : m), null);
    await sb.from('quake_sync_state').upsert({
      source: id,
      status: missing.length ? 'schema_changed' : 'ok',
      last_attempt_at: now.toISOString(),
      last_success_at: now.toISOString(),
      last_event_at: newest ?? state?.last_event_at ?? null,
      consecutive_failures: 0,
      next_attempt_at: null,
      last_error: missing.length ? `Kaynak yanıtında beklenen alanlar yok: ${missing.join(', ')}` : null,
      last_count: readings.length,
      last_written: changed.length,
      sample_keys: keys,
      updated_at: now.toISOString(),
    });
    return { source: id, ok: true, fetched: readings.length, written: changed.length };
  } catch (e) {
    const failures = (state?.consecutive_failures ?? 0) + 1;
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    console.error(`[${id}] senkron hatası (${failures}. ardışık):`, message);
    // Son başarılı veriler silinmez; yalnızca durum ve bir sonraki deneme zamanı güncellenir.
    await sb.from('quake_sync_state').upsert({
      source: id,
      status: 'error',
      last_attempt_at: now.toISOString(),
      consecutive_failures: failures,
      next_attempt_at: backoffUntil(failures, now).toISOString(),
      last_error: message,
      updated_at: now.toISOString(),
    });
    return { source: id, ok: false, fetched: 0, written: 0, error: message };
  }
}

/** Son 30 dakikadaki birleşik olaylar için (henüz bildirilmemişse) push gönderir. */
async function notifyNewEvents(sb: SupabaseClient, now: Date) {
  const since = new Date(now.getTime() - NOTIFY_WINDOW_MIN * 60_000).toISOString();
  const { data: rows } = await sb.from('earthquake_readings').select(READING_COLUMNS).gte('occurred_at', since);
  const events = mergeReadings(((rows ?? []) as ReadingRow[]).map(rowToReading).filter((r): r is SourceReading => !!r));
  const candidates = events.filter((e) => e.primary.magnitude != null && e.primary.magnitude >= MIN_NOTIFY_MAGNITUDE);

  let accepted = 0;
  let invalid = 0;
  for (const e of candidates) {
    // Birleşik olayın tüm kaynak anahtarları; herhangi biri bildirildiyse tekrar gönderme (idempotent).
    const keys = e.readings.map((r) => `${r.source}:${r.sourceEventId}`);
    const { data: seen } = await sb.from('notified_events').select('event_key').in('event_key', keys);
    if (seen && seen.length) continue;
    const { error: claimErr } = await sb.from('notified_events').insert(keys.map((k) => ({ event_key: k, magnitude: e.primary.magnitude })));
    if (claimErr) continue; // eşzamanlı başka çalıştırma aldı

    const { data: prefs } = await sb
      .from('notification_preferences')
      .select('user_id, quakes_enabled, official_enabled, min_magnitude, region_lat, region_lon, region_radius_km, min_interval_minutes')
      .or('quakes_enabled.eq.true,official_enabled.eq.true');
    const { data: last } = await sb.from('push_deliveries').select('user_id, last_sent_at');
    const lastMap = new Map((last ?? []).map((l) => [l.user_id as string, l.last_sent_at as string]));
    const users = selectRecipients(e.primary, (prefs ?? []) as Pref[], lastMap, now);
    if (!users.length) continue;

    const { data: tokens } = await sb.from('push_tokens').select('token').in('user_id', users);
    const content = quakePushContent(e);
    const result = await sendExpoPush(
      (tokens ?? []).map((t) => ({
        to: t.token as string,
        ...content,
        data: { url: `guvende://deprem/${encodeURIComponent(e.id)}` },
        channelId: 'quakes',
        sound: 'default' as const,
      })),
      Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined,
    );
    accepted += result.accepted;
    if (result.invalidTokens.length) {
      invalid += result.invalidTokens.length;
      await sb.from('push_tokens').delete().in('token', result.invalidTokens);
    }
    await sb.from('push_deliveries').upsert(users.map((u) => ({ user_id: u, last_sent_at: now.toISOString() })));
  }
  return { candidates: candidates.length, accepted, invalidTokensRemoved: invalid };
}

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const secret = await serverSecret(sb, 'INGEST_SECRET', 'ingest_secret');
  if (!secret || req.headers.get('x-ingest-secret') !== secret) return new Response('forbidden', { status: 403 });

  const now = new Date();
  const { data: states } = await sb.from('quake_sync_state').select('*');
  const byId = new Map(((states ?? []) as SyncState[]).map((s) => [s.source, s]));
  const sources = await Promise.all(ORDER.map((id) => syncSource(sb, id, byId.get(id) ?? null, now)));

  let push: Awaited<ReturnType<typeof notifyNewEvents>> | { error: string };
  try {
    push = await notifyNewEvents(sb, now);
  } catch (e) {
    console.error('bildirim değerlendirmesi başarısız', e);
    push = { error: e instanceof Error ? e.message : String(e) };
  }
  // "accepted" = Expo'nun kabul ettiği mesaj; cihaza teslim veya okunma anlamına gelmez.
  return Response.json({ at: now.toISOString(), sources, push });
});
