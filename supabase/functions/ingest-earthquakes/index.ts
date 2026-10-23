// Zamanlanmış görev (ör. her dakika): kaynakları sorgular, okumaları kaydeder ve
// yeni önemli olaylar için tercihe göre push gönderir. Bu bir ERKEN UYARI sistemi değildir;
// bildirim, olay kaynaklarda yayımlandıktan sonra (dakikalar mertebesinde gecikmeyle) gider.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadEarthquakes, defaultQuery } from '../_shared/app/features/earthquakes/repository.ts';
import { formatMagnitude, placeTitle } from '../_shared/app/features/earthquakes/format.core.ts';
import type { Fetcher } from '../_shared/app/features/earthquakes/sources/types.ts';
import { selectRecipients, sendExpoPush, type Pref } from '../_shared/recipients.ts';
import { serverSecret } from '../_shared/secrets.ts';

const NOTIFY_WINDOW_MIN = 30;
const MIN_NOTIFY_MAGNITUDE = 3.0;

const fetcher: Fetcher = (url, init) => fetch(url, { headers: init?.headers, signal: AbortSignal.timeout(15000) });

Deno.serve(async (req) => {
  // Yalnızca zamanlayıcı/servis çağırabilir.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const secret = await serverSecret(sb, 'INGEST_SECRET', 'ingest_secret');
  if (!secret || req.headers.get('x-ingest-secret') !== secret) return new Response('forbidden', { status: 403 });
  const now = new Date();
  const q = defaultQuery(now);
  q.since = new Date(now.getTime() - 6 * 3600_000);
  const { snapshot } = await loadEarthquakes(['afad', 'kandilli', 'usgs'], fetcher, null, q);

  const rows = snapshot.events.flatMap((e) =>
    e.readings.map((r) => ({
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
    })),
  );
  if (rows.length) {
    const { error } = await sb.from('earthquake_readings').upsert(rows);
    if (error) console.error('upsert', error);
  }

  // Bildirim adayları: yeni, büyüklüğü bilinen olaylar
  const candidates = snapshot.events.filter(
    (e) => e.primary.magnitude != null && e.primary.magnitude >= MIN_NOTIFY_MAGNITUDE && now.getTime() - Date.parse(e.primary.occurredAt) < NOTIFY_WINDOW_MIN * 60_000,
  );
  let pushed = 0;
  for (const e of candidates) {
    // Birleşik olayın tüm kaynak anahtarları; herhangi biri bildirildiyse tekrar gönderme.
    const keys = e.readings.map((r) => `${r.source}:${r.sourceEventId}`);
    const { data: seen } = await sb.from('notified_events').select('event_key').in('event_key', keys);
    if (seen && seen.length) continue;
    const { error: claimErr } = await sb.from('notified_events').insert(keys.map((k) => ({ event_key: k, magnitude: e.primary.magnitude })));
    if (claimErr) continue; // eşzamanlı başka çalıştırma almış

    const { data: prefs } = await sb
      .from('notification_preferences')
      .select('user_id, quakes_enabled, official_enabled, min_magnitude, region_lat, region_lon, region_radius_km, min_interval_minutes')
      .or('quakes_enabled.eq.true,official_enabled.eq.true');
    const { data: last } = await sb.from('push_deliveries').select('user_id, last_sent_at');
    const lastMap = new Map((last ?? []).map((l) => [l.user_id as string, l.last_sent_at as string]));
    const users = selectRecipients(e.primary, (prefs ?? []) as Pref[], lastMap, now);
    if (!users.length) continue;

    const { data: tokens } = await sb.from('push_tokens').select('token, user_id').in('user_id', users);
    const src = e.readings.map((r) => r.source.toUpperCase()).join('/');
    pushed += await sendExpoPush(
      (tokens ?? []).map((t) => ({
        to: t.token,
        title: `Deprem kaydı: M${formatMagnitude(e.primary.magnitude)} ${placeTitle(e)}`,
        body: `${src} tarafından yayımlandı. Derinlik ${e.primary.depthKm ?? '?'} km. Bu bir erken uyarı değildir.`,
        data: { url: `guvende://deprem/${encodeURIComponent(e.id)}` },
        channelId: 'quakes',
        sound: 'default',
      })),
      Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined,
    );
    await sb.from('push_deliveries').upsert(users.map((u) => ({ user_id: u, last_sent_at: now.toISOString() })));
  }

  return Response.json({ readings: rows.length, health: snapshot.health, candidates: candidates.length, pushed });
});
