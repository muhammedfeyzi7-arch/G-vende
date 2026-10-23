-- Deprem senkronizasyonu: kaynak başına durum, değişiklik zamanları ve canlı (Realtime) yayın.
-- Geriye uyumlu: mevcut sütun ve satırlar korunur.

-- Okuma satırı ilk ne zaman görüldü / kaynakta en son ne zaman değişti (fetched_at = son yazım).
alter table public.earthquake_readings
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Kaynak başına senkron durumu. "Son başarılı çekim", "kaynaktaki en yeni olay" ve "durum" ayrı tutulur.
create table if not exists public.quake_sync_state (
  source text primary key check (source in ('afad', 'kandilli', 'usgs', 'emsc')),
  status text not null default 'never' check (status in ('never', 'ok', 'error', 'schema_changed')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_event_at timestamptz,
  consecutive_failures integer not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  last_count integer,
  last_written integer,
  -- Kaynağın gerçek yanıtında görülen alan adları (değer saklanmaz); şema değişikliğini fark etmek için.
  sample_keys text[],
  updated_at timestamptz not null default now()
);
alter table public.quake_sync_state enable row level security;
-- Herkes okuyabilir (uygulama "son senkronizasyon" gösterir); yalnızca service_role yazar.
drop policy if exists quake_sync_state_public_read on public.quake_sync_state;
create policy quake_sync_state_public_read on public.quake_sync_state for select to anon, authenticated using (true);
revoke insert, update, delete, truncate, references, trigger on public.quake_sync_state from anon, authenticated;
grant select on public.quake_sync_state to anon, authenticated;

-- Canlı güncelleme: yeni/değişen okumalar ve senkron durumu istemcilere yayınlanır (RLS okuma kuralı geçerli).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'earthquake_readings') then
      alter publication supabase_realtime add table public.earthquake_readings;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'quake_sync_state') then
      alter publication supabase_realtime add table public.quake_sync_state;
    end if;
  end if;
end $$;

-- Kaynak kullanım koşulları yazılı olarak doğrulanmadığı için 1 dk yerine 2 dk aralık.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ingest-earthquakes';
    perform cron.schedule(
      'ingest-earthquakes',
      '*/2 * * * *',
      $job$select public.invoke_edge_function('ingest-earthquakes', '{}'::jsonb, 'x-ingest-secret', 'ingest_secret')$job$
    );
  end if;
end $$;

-- Geçersiz push belirteçleri: Expo "DeviceNotRegistered" döndürünce silinir (ingest/notify-family).
alter table public.push_tokens add column if not exists last_error text;
