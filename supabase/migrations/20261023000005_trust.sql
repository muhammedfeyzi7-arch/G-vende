-- GÜVENDE — bilgi kirliliğine karşı güven katmanı (prototip)
-- Kurallar sunucuda (tetikleyici + RLS) uygulanır; istemci yalnızca kullanıcıyı yönlendirir.
--  1) Kimlik: bildirim/oy için NVİ kimlik doğrulaması (verify-identity fonksiyonu) veya kurumsal rol.
--  2) Konum: bildirimin konumu, cihazın o anki GPS konumuna en fazla 1 km uzak olmalı.
--  3) Fotoğraf: hasar ve yol bildirimleri, uygulama kamerasıyla son 10 dakikada çekilmiş
--     fotoğraf eklenene kadar yayınlanmaz.
--  4) Topluluk: 500 m içindeki doğrulanmış kullanıcılar oylar; 3 onay → "Doğrulanmış",
--     3 ret (ve onaydan fazla) → kaldırılır, yazara ihlal puanı ve süreli askı.
--  5) Kurumsal hesaplar (AFAD, AKUT, Kızılay, belediye, kurtarma ekibi): rozetli, doğrudan "Resmî".
-- T.C. kimlik numarası, ad, soyad ve doğum yılı SAKLANMAZ; yalnızca anahtarlı özet (HMAC) tutulur.

-- ───────────────────────── Profil güven alanları ─────────────────────────
alter table public.profiles
  add column identity_verified_at timestamptz,
  add column identity_hash text unique,
  add column role text not null default 'user' check (role in ('user', 'official', 'rescue')),
  add column org_name text check (org_name is null or char_length(org_name) between 2 and 80),
  add column strikes smallint not null default 0,
  add column suspended_until timestamptz;

-- İstemci yalnızca görünen adını yazabilir; güven alanlarını yalnızca service_role değiştirir.
revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, created_at, identity_verified_at, role, org_name, strikes, suspended_until)
  on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.user_role(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = uid), 'user');
$$;
create or replace function public.is_identity_verified(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = uid and (identity_verified_at is not null or role in ('official', 'rescue')));
$$;
create or replace function public.is_suspended(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and suspended_until > now());
$$;

-- İstemcinin kendi güven durumunu tek çağrıda okuması için.
create or replace function public.my_trust() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'verified', public.is_identity_verified(auth.uid()),
    'role', public.user_role(auth.uid()),
    'org_name', (select org_name from public.profiles where id = auth.uid()),
    'strikes', coalesce((select strikes from public.profiles where id = auth.uid()), 0),
    'suspended_until', (select suspended_until from public.profiles where id = auth.uid())
  );
$$;
revoke execute on function public.my_trust() from anon;

-- Kimlik doğrulama denemeleri (hız sınırı için; kimlik verisi içermez).
create table public.identity_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index identity_attempts_user_idx on public.identity_attempts (user_id, created_at desc);
alter table public.identity_attempts enable row level security;
revoke all on public.identity_attempts from anon, authenticated;

-- ───────────────────────── Uzaklık (PostGIS gerektirmez) ─────────────────────────
create or replace function public.distance_m(lat1 double precision, lon1 double precision,
                                             lat2 double precision, lon2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

-- ───────────────────────── Bildirim güven alanları ─────────────────────────
alter table public.user_reports drop constraint user_reports_status_check;
alter table public.user_reports add constraint user_reports_status_check
  check (status in ('visible', 'pending_photo', 'hidden', 'removed'));

alter table public.user_reports
  -- Olay yerinin tam konumu: yalnızca sunucuda, oy veren kişinin yakınlığını ölçmek için.
  add column precise_latitude double precision,
  add column precise_longitude double precision,
  -- Gönderim anındaki cihaz konumu: yalnızca kontrol için yazılır, tetikleyici siler.
  add column device_latitude double precision,
  add column device_longitude double precision,
  add column device_accuracy_m real,
  add column confirm_count smallint not null default 0,
  add column deny_count smallint not null default 0,
  add column author_role text check (author_role in ('official', 'rescue')),
  add column author_org text;

grant select (confirm_count, deny_count, author_role, author_org) on public.user_reports to anon, authenticated;
grant insert (device_latitude, device_longitude, device_accuracy_m) on public.user_reports to authenticated;

create or replace function public.user_reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent_10m int;
  recent_24h int;
  r text;
begin
  new.author_id := auth.uid();
  if new.author_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  r := public.user_role(new.author_id);

  if public.is_suspended(new.author_id) then
    raise exception 'account_suspended' using errcode = 'P0001',
      hint = 'Yanlış ihbar nedeniyle hesabınız geçici olarak bildirim gönderemez.';
  end if;
  if not public.is_identity_verified(new.author_id) then
    raise exception 'identity_required' using errcode = 'P0001', hint = 'Bildirim için kimlik doğrulaması gerekir.';
  end if;

  -- Olay yeri bildiren kategorilerde konum zorunlu.
  if new.category in ('damage', 'road', 'help') and new.latitude is null then
    raise exception 'location_required' using errcode = 'P0001';
  end if;

  -- Konumlu bildirimde cihaz GPS'i olay yerine yakın olmalı (kurumsal hesaplar hariç).
  if new.latitude is not null and r = 'user' then
    if new.device_latitude is null or new.device_longitude is null then
      raise exception 'device_location_required' using errcode = 'P0001';
    end if;
    if new.device_accuracy_m is null or new.device_accuracy_m > 100 then
      raise exception 'location_inaccurate' using errcode = 'P0001', hint = 'GPS doğruluğu 100 m''den iyi olmalı.';
    end if;
    if public.distance_m(new.latitude, new.longitude, new.device_latitude, new.device_longitude) > 1000 then
      raise exception 'too_far' using errcode = 'P0001', hint = 'Yalnızca bulunduğunuz yerin 1 km yakınını bildirebilirsiniz.';
    end if;
  end if;
  new.device_latitude := null;
  new.device_longitude := null;
  new.device_accuracy_m := null;

  new.status := case when new.category in ('damage', 'road') and r = 'user' then 'pending_photo' else 'visible' end;
  new.verification := case when r in ('official', 'rescue') then 'official' else 'unverified' end;
  new.author_role := case when r in ('official', 'rescue') then r end;
  new.author_org := case when r in ('official', 'rescue') then (select org_name from public.profiles where id = new.author_id) end;
  new.helpful_count := 0;
  new.flag_count := 0;
  new.confirm_count := 0;
  new.deny_count := 0;
  new.created_at := now();
  if new.latitude is not null then
    new.precise_latitude := new.latitude;
    new.precise_longitude := new.longitude;
    new.latitude := round(new.latitude::numeric, 2)::double precision;
    new.longitude := round(new.longitude::numeric, 2)::double precision;
  else
    new.precise_latitude := null;
    new.precise_longitude := null;
  end if;
  new.description := nullif(btrim(regexp_replace(new.description, '[[:cntrl:]]', ' ', 'g')), '');
  new.area_label := nullif(btrim(new.area_label), '');

  select count(*) filter (where created_at > now() - interval '10 minutes'),
         count(*)
    into recent_10m, recent_24h
    from public.user_reports
   where author_id = new.author_id and created_at > now() - interval '24 hours';
  if recent_10m >= 3 or recent_24h >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Kısa sürede çok fazla bildirim gönderildi.';
  end if;
  return new;
end $$;

-- Yazar, fotoğraf bekleyen kendi bildirimini de görebilir (yükleme tamamlanana kadar).
create or replace function public.is_own_pending(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_reports where id = rid and author_id = auth.uid() and status = 'pending_photo');
$$;
create policy user_reports_read_own_pending on public.user_reports for select to authenticated
  using (status = 'pending_photo' and public.is_own_pending(id));

-- ───────────────────────── Kamera fotoğrafı ─────────────────────────
alter table public.report_media
  add column captured_at timestamptz,
  add column source text not null default 'camera' check (source = 'camera');
grant insert (captured_at) on public.report_media to authenticated;
grant select (captured_at) on public.report_media to anon, authenticated;

create or replace function public.report_media_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rep_created timestamptz;
begin
  new.author_id := auth.uid();
  new.source := 'camera';
  select created_at into rep_created from public.user_reports where id = new.report_id;
  -- Çekim zamanı: son 10 dakika içinde ve bildirimden en fazla 10 dakika önce.
  if new.captured_at is null or new.captured_at > now() + interval '1 minute'
     or new.captured_at < now() - interval '10 minutes'
     or new.captured_at < rep_created - interval '10 minutes' then
    raise exception 'photo_not_live' using errcode = 'P0001', hint = 'Yalnızca uygulama kamerasıyla şimdi çekilen fotoğraf eklenebilir.';
  end if;
  return new;
end $$;
create trigger report_media_before_insert before insert on public.report_media
  for each row execute function public.report_media_before_insert();

create or replace function public.report_media_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.user_reports set status = 'visible' where id = new.report_id and status = 'pending_photo';
  return null;
end $$;
create trigger report_media_after_insert after insert on public.report_media
  for each row execute function public.report_media_after_insert();

-- ───────────────────────── Topluluk doğrulaması ─────────────────────────
create table public.report_votes (
  report_id uuid not null references public.user_reports (id) on delete cascade,
  voter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote text not null check (vote in ('confirm', 'deny')),
  weight smallint not null default 1,
  -- Oy anındaki cihaz konumu yalnızca kontrol içindir; tetikleyici siler.
  device_latitude double precision,
  device_longitude double precision,
  device_accuracy_m real,
  created_at timestamptz not null default now(),
  primary key (report_id, voter_id)
);
alter table public.report_votes enable row level security;
revoke all on public.report_votes from anon, authenticated;
grant select (report_id, vote, created_at) on public.report_votes to authenticated;
grant insert (report_id, vote, device_latitude, device_longitude, device_accuracy_m) on public.report_votes to authenticated;
create policy report_votes_own_select on public.report_votes for select to authenticated using (voter_id = auth.uid());
create policy report_votes_own_insert on public.report_votes for insert to authenticated with check (voter_id = auth.uid());

create or replace function public.report_votes_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rep public.user_reports%rowtype;
  r text;
  recent int;
begin
  new.voter_id := auth.uid();
  if new.voter_id is null then raise exception 'auth_required' using errcode = '42501'; end if;
  r := public.user_role(new.voter_id);
  if public.is_suspended(new.voter_id) then raise exception 'account_suspended' using errcode = 'P0001'; end if;
  if not public.is_identity_verified(new.voter_id) then raise exception 'identity_required' using errcode = 'P0001'; end if;

  select * into rep from public.user_reports where id = new.report_id;
  if not found or rep.status <> 'visible' then raise exception 'report_not_found' using errcode = 'P0001'; end if;
  if rep.author_id = new.voter_id then raise exception 'own_report' using errcode = 'P0001'; end if;
  if rep.verification = 'official' then raise exception 'official_report' using errcode = 'P0001'; end if;
  if rep.precise_latitude is null then raise exception 'no_location' using errcode = 'P0001'; end if;

  if r = 'user' then
    if new.device_latitude is null or new.device_longitude is null then
      raise exception 'device_location_required' using errcode = 'P0001';
    end if;
    if new.device_accuracy_m is null or new.device_accuracy_m > 100 then
      raise exception 'location_inaccurate' using errcode = 'P0001';
    end if;
    if public.distance_m(rep.precise_latitude, rep.precise_longitude, new.device_latitude, new.device_longitude) > 500 then
      raise exception 'too_far' using errcode = 'P0001', hint = 'Yalnızca 500 m yakınınızdaki bildirimleri oylayabilirsiniz.';
    end if;
  end if;

  select count(*) into recent from public.report_votes where voter_id = new.voter_id and created_at > now() - interval '1 hour';
  if recent >= 30 then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  -- Kurumsal hesabın oyu tek başına eşiği doldurur.
  new.weight := case when r in ('official', 'rescue') then 3 else 1 end;
  new.device_latitude := null;
  new.device_longitude := null;
  new.device_accuracy_m := null;
  new.created_at := now();
  return new;
end $$;
create trigger report_votes_before_insert before insert on public.report_votes
  for each row execute function public.report_votes_before_insert();

create or replace function public.report_votes_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rep public.user_reports%rowtype;
  new_strikes smallint;
begin
  update public.user_reports
     set confirm_count = confirm_count + case when new.vote = 'confirm' then new.weight else 0 end,
         deny_count = deny_count + case when new.vote = 'deny' then new.weight else 0 end
   where id = new.report_id
   returning * into rep;

  if rep.confirm_count >= 3 and rep.verification = 'unverified' and rep.confirm_count > rep.deny_count then
    update public.user_reports set verification = 'community' where id = rep.id;
  elsif rep.deny_count >= 3 and rep.deny_count > rep.confirm_count and rep.status = 'visible' then
    update public.user_reports set status = 'removed' where id = rep.id;
    -- İhlal puanı: 1. ihlalde 7 gün, sonrakilerde 30 gün bildirim/oy yasağı.
    update public.profiles
       set strikes = strikes + 1,
           suspended_until = now() + case when strikes + 1 >= 2 then interval '30 days' else interval '7 days' end
     where id = rep.author_id
     returning strikes into new_strikes;
    if not found then
      insert into public.profiles (id, strikes, suspended_until) values (rep.author_id, 1, now() + interval '7 days');
    end if;
  end if;
  return null;
end $$;
create trigger report_votes_after_insert after insert on public.report_votes
  for each row execute function public.report_votes_after_insert();
