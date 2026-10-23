-- Sunucu içi işler: gizli değerler (Vault), dakikalık deprem verisi alma (pg_cron + pg_net) ve
-- "Güvendeyim" bildirimleri için safety_checkins tetikleyicisi. Gizli değerler veritabanında rastgele
-- üretilir; panelden elle girilmesi gerekmez. Edge Function ortam değişkeni (INGEST_SECRET vb.) varsa o önceliklidir.
-- Vault/pg_cron/pg_net olmayan ortamlarda (yerel test Postgres'i) bu dosya hiçbir şey yapmaz.
do $outer$
begin
  if (select count(*) from pg_available_extensions where name in ('pg_cron', 'pg_net', 'supabase_vault')) < 3 then
    raise notice 'pg_cron/pg_net/supabase_vault yok; zamanlanmış işler atlandı';
    return;
  end if;

  create extension if not exists pg_net;
  create extension if not exists pg_cron;

  -- Yoksa rastgele gizli değerler üret. project_url, kurulumda Vault'a ayrıca yazılır.
  if not exists (select 1 from vault.secrets where name = 'ingest_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ingest_secret');
  end if;
  if not exists (select 1 from vault.secrets where name = 'webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'webhook_secret');
  end if;
  if not exists (select 1 from vault.secrets where name = 'identity_hash_pepper') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'identity_hash_pepper');
  end if;

  -- Edge Function'ların (service_role) okuyabildiği, beyaz listeli gizli değer erişimi.
  execute $f$
    create or replace function public.internal_secret(p_name text)
    returns text
    language sql
    stable
    security definer
    set search_path = ''
    as $$
      select decrypted_secret from vault.decrypted_secrets
      where name = p_name and p_name in ('ingest_secret', 'webhook_secret', 'identity_hash_pepper')
      limit 1
    $$
  $f$;
  revoke execute on function public.internal_secret(text) from public, anon, authenticated;
  grant execute on function public.internal_secret(text) to service_role;

  -- Bir Edge Function'ı gizli başlıkla çağırır (asenkron, pg_net). project_url yoksa sessizce atlar.
  execute $f$
    create or replace function public.invoke_edge_function(p_fn text, p_body jsonb, p_header text, p_secret text)
    returns void
    language plpgsql
    security definer
    set search_path = ''
    as $$
    declare
      base text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1);
      secret text := (select decrypted_secret from vault.decrypted_secrets where name = p_secret limit 1);
    begin
      if base is null or secret is null then
        return;
      end if;
      perform net.http_post(
        url := base || '/functions/v1/' || p_fn,
        body := p_body,
        headers := jsonb_build_object('Content-Type', 'application/json', p_header, secret),
        timeout_milliseconds := 30000
      );
    end
    $$
  $f$;
  revoke execute on function public.invoke_edge_function(text, jsonb, text, text) from public, anon, authenticated;

  execute $f$
    create or replace function public.notify_family_on_checkin()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $$
    begin
      -- Konum gönderilmez; push içeriği için yalnızca grup, kişi ve durum yeterli.
      perform public.invoke_edge_function(
        'notify-family',
        jsonb_build_object(
          'type', 'INSERT',
          'table', 'safety_checkins',
          'record', jsonb_build_object('group_id', new.group_id, 'user_id', new.user_id, 'status', new.status)
        ),
        'x-webhook-secret',
        'webhook_secret'
      );
      return new;
    end
    $$
  $f$;
  revoke execute on function public.notify_family_on_checkin() from public, anon, authenticated;

  drop trigger if exists safety_checkins_notify on public.safety_checkins;
  create trigger safety_checkins_notify after insert on public.safety_checkins
    for each row execute function public.notify_family_on_checkin();

  perform cron.unschedule(jobid) from cron.job where jobname = 'ingest-earthquakes';
  perform cron.schedule(
    'ingest-earthquakes',
    '* * * * *',
    $job$select public.invoke_edge_function('ingest-earthquakes', '{}'::jsonb, 'x-ingest-secret', 'ingest_secret')$job$
  );
end
$outer$;
