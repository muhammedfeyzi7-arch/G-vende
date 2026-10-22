-- GÜVENDE — ilk şema
-- İlkeler: en az veri, RLS her tabloda açık, hassas alanlar sütun yetkileriyle gizli,
-- yazma işlemleri yalnızca sahibine; servis anahtarı istemciye verilmez.

create extension if not exists pgcrypto;

-- ───────────────────────── Profiller ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ───────────────────────── Deprem olayları (sunucu tarafı alım için) ─────────────────────────
-- Yalnızca service_role yazar. Her kaynak okuması ayrı satırdır; özgün değerler korunur.
create table public.earthquake_readings (
  source text not null check (source in ('afad', 'kandilli', 'usgs')),
  source_event_id text not null,
  magnitude numeric(3, 1),
  magnitude_type text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  depth_km numeric(6, 2),
  occurred_at timestamptz not null,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  place text,
  url text,
  review_status text not null default 'unknown' check (review_status in ('reviewed', 'automatic', 'unknown')),
  primary key (source, source_event_id)
);
create index earthquake_readings_time_idx on public.earthquake_readings (occurred_at desc);
alter table public.earthquake_readings enable row level security;
create policy earthquake_readings_public_read on public.earthquake_readings for select to anon, authenticated using (true);

-- ───────────────────────── Toplanma alanları ─────────────────────────
-- Yalnızca doğrulanabilir resmî kaynaklardan içe aktarılır (scripts/import-assembly-points.ts).
create table public.assembly_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  province text,
  district text,
  neighborhood text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  capacity integer,
  source_name text not null,
  source_url text not null,
  source_record_id text,
  source_published_at date,
  imported_at timestamptz not null default now(),
  unique (source_name, source_record_id)
);
create index assembly_points_geo_idx on public.assembly_points (latitude, longitude);
create index assembly_points_district_idx on public.assembly_points (province, district);
alter table public.assembly_points enable row level security;
create policy assembly_points_public_read on public.assembly_points for select to anon, authenticated using (true);

-- ───────────────────────── Kullanıcı bildirimleri ─────────────────────────
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Çevrimdışı kuyruğun tekrar gönderimlerini tekilleştirmek için istemci kimliği
  client_id uuid not null,
  category text not null check (category in ('shake', 'damage', 'road', 'safe', 'help', 'other')),
  felt_intensity smallint check (felt_intensity between 1 and 4),
  description text check (description is null or char_length(description) <= 500),
  -- Yalnızca yaklaşık konum saklanır (tetikleyici 0.01°'ye yuvarlar ≈ 1 km).
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  area_label text check (area_label is null or char_length(area_label) <= 80),
  earthquake_event_id text,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  verification text not null default 'unverified' check (verification in ('unverified', 'community', 'official')),
  helpful_count integer not null default 0,
  flag_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (author_id, client_id),
  check ((latitude is null) = (longitude is null)),
  check (category = 'shake' or felt_intensity is null)
);
create index user_reports_feed_idx on public.user_reports (status, created_at desc);
alter table public.user_reports enable row level security;

-- Yazar kimliği ve sayaçlar istemciden okunamaz/yazılamaz: sütun yetkileri.
revoke all on public.user_reports from anon, authenticated;
grant select (id, category, felt_intensity, description, latitude, longitude, area_label, earthquake_event_id,
              verification, helpful_count, created_at)
  on public.user_reports to anon, authenticated;
grant insert (client_id, category, felt_intensity, description, latitude, longitude, area_label, earthquake_event_id)
  on public.user_reports to authenticated;
grant delete on public.user_reports to authenticated;

create policy user_reports_read_visible on public.user_reports for select to anon, authenticated
  using (status = 'visible' and created_at > now() - interval '7 days');
create policy user_reports_insert_own on public.user_reports for insert to authenticated
  with check (author_id = auth.uid());
create policy user_reports_delete_own on public.user_reports for delete to authenticated
  using (author_id = auth.uid());

-- Konumu yuvarla, metni temizle, hız sınırını uygula.
create or replace function public.user_reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent_10m int;
  recent_24h int;
begin
  new.author_id := auth.uid();
  if new.author_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  new.status := 'visible';
  new.verification := 'unverified';
  new.helpful_count := 0;
  new.flag_count := 0;
  new.created_at := now();
  if new.latitude is not null then
    new.latitude := round(new.latitude::numeric, 2)::double precision;
    new.longitude := round(new.longitude::numeric, 2)::double precision;
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
create trigger user_reports_before_insert before insert on public.user_reports
  for each row execute function public.user_reports_before_insert();

-- ───────────────────────── Bildirim fotoğrafları ─────────────────────────
create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.user_reports (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.report_media enable row level security;
revoke all on public.report_media from anon, authenticated;
grant select (id, report_id, storage_path, created_at) on public.report_media to anon, authenticated;
grant insert (report_id, storage_path) on public.report_media to authenticated;

-- Politika alt sorguları çağıranın sütun yetkileriyle çalışır; gizli sütunlar
-- (author_id, status) için security definer yardımcıları kullanılır.
create or replace function public.report_is_visible(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_reports where id = rid and status = 'visible');
$$;
create or replace function public.is_report_author(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_reports where id = rid and author_id = auth.uid());
$$;
create or replace function public.report_media_count(rid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.report_media where report_id = rid;
$$;
create or replace function public.media_path_visible(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.report_media m join public.user_reports r on r.id = m.report_id
                  where m.storage_path = path and r.status = 'visible');
$$;

create policy report_media_read on public.report_media for select to anon, authenticated
  using (public.report_is_visible(report_id));
create policy report_media_insert_own on public.report_media for insert to authenticated
  with check (
    author_id = auth.uid()
    and storage_path like auth.uid()::text || '/%'
    and public.is_report_author(report_id)
    and public.report_media_count(report_id) < 3
  );

-- ───────────────────────── Faydalı bulma ─────────────────────────
create table public.report_reactions (
  report_id uuid not null references public.user_reports (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);
alter table public.report_reactions enable row level security;
create policy report_reactions_own_select on public.report_reactions for select to authenticated using (user_id = auth.uid());
create policy report_reactions_own_insert on public.report_reactions for insert to authenticated with check (user_id = auth.uid());
create policy report_reactions_own_delete on public.report_reactions for delete to authenticated using (user_id = auth.uid());

create or replace function public.report_reactions_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.user_reports set helpful_count = helpful_count + 1 where id = new.report_id;
  else
    update public.user_reports set helpful_count = greatest(helpful_count - 1, 0) where id = old.report_id;
  end if;
  return null;
end $$;
create trigger report_reactions_count after insert or delete on public.report_reactions
  for each row execute function public.report_reactions_count();

-- ───────────────────────── Moderasyon ─────────────────────────
create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.user_reports (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null check (reason in ('false_info', 'spam', 'personal_info', 'offensive', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (report_id, reporter_id)
);
alter table public.moderation_reports enable row level security;
create policy moderation_reports_insert_own on public.moderation_reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy moderation_reports_own_select on public.moderation_reports for select to authenticated
  using (reporter_id = auth.uid());

-- Eşik: 3 farklı kullanıcı işaretlerse bildirim moderatör incelemesine kadar gizlenir.
create or replace function public.moderation_reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.user_reports
     set flag_count = flag_count + 1,
         status = case when flag_count + 1 >= 3 and status = 'visible' then 'hidden' else status end
   where id = new.report_id;
  return null;
end $$;
create trigger moderation_reports_after_insert after insert on public.moderation_reports
  for each row execute function public.moderation_reports_after_insert();

-- ───────────────────────── Aile ağı ─────────────────────────
create table public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meeting_point_name text check (meeting_point_name is null or char_length(meeting_point_name) <= 80),
  meeting_point_lat double precision check (meeting_point_lat between -90 and 90),
  meeting_point_lon double precision check (meeting_point_lon between -180 and 180),
  created_at timestamptz not null default now()
);
create table public.family_members (
  group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  share_location boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table public.family_invites (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '48 hours',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create table public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null check (status in ('safe', 'need_help')),
  note text check (note is null or char_length(note) <= 200),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create index safety_checkins_group_idx on public.safety_checkins (group_id, created_at desc);

alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.safety_checkins enable row level security;

-- RLS özyinelemesini önlemek için security definer yardımcıları
create or replace function public.is_family_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where group_id = gid and user_id = auth.uid());
$$;
create or replace function public.is_family_owner(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where group_id = gid and user_id = auth.uid() and role = 'owner');
$$;
revoke execute on function public.is_family_member(uuid), public.is_family_owner(uuid) from public, anon;

create policy family_groups_member_read on public.family_groups for select to authenticated
  using (public.is_family_member(id));
create policy family_groups_owner_update on public.family_groups for update to authenticated
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));
create policy family_groups_owner_delete on public.family_groups for delete to authenticated
  using (public.is_family_owner(id));
-- Grup oluşturma create_family_group() üzerinden yapılır (sahip üyeliği atomik eklenir).

create policy family_members_member_read on public.family_members for select to authenticated
  using (public.is_family_member(group_id));
create policy family_members_self_update on public.family_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy family_members_leave_or_remove on public.family_members for delete to authenticated
  using (user_id = auth.uid() or public.is_family_owner(group_id));
-- Rol yükseltmeyi engelle: üye yalnızca kendi görünen adını ve konum paylaşımını değiştirebilir.
revoke update on public.family_members from authenticated;
grant update (display_name, share_location) on public.family_members to authenticated;

create policy family_invites_owner_read on public.family_invites for select to authenticated
  using (public.is_family_owner(group_id));
create policy family_invites_owner_insert on public.family_invites for insert to authenticated
  with check (created_by = auth.uid() and public.is_family_owner(group_id));
create policy family_invites_owner_delete on public.family_invites for delete to authenticated
  using (public.is_family_owner(group_id));

create policy safety_checkins_member_read on public.safety_checkins for select to authenticated
  using (public.is_family_member(group_id));
create policy safety_checkins_member_insert on public.safety_checkins for insert to authenticated
  with check (user_id = auth.uid() and public.is_family_member(group_id));

-- Konum yalnızca üye paylaşımı açtıysa saklanır.
create or replace function public.safety_checkins_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  if not exists (select 1 from public.family_members
                  where group_id = new.group_id and user_id = new.user_id and share_location) then
    new.latitude := null;
    new.longitude := null;
  end if;
  return new;
end $$;
create trigger safety_checkins_before_insert before insert on public.safety_checkins
  for each row execute function public.safety_checkins_before_insert();

create or replace function public.create_family_group(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '42501'; end if;
  if (select count(*) from public.family_members where user_id = auth.uid() and role = 'owner') >= 5 then
    raise exception 'too_many_groups' using errcode = 'P0001';
  end if;
  insert into public.family_groups (name, created_by) values (p_name, auth.uid()) returning id into gid;
  insert into public.family_members (group_id, user_id, role, display_name) values (gid, auth.uid(), 'owner', p_display_name);
  return gid;
end $$;

create or replace function public.accept_family_invite(p_token text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.family_invites;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '42501'; end if;
  select * into inv from public.family_invites where token = p_token for update;
  if not found or inv.used_by is not null or inv.expires_at < now() then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;
  if (select count(*) from public.family_members where group_id = inv.group_id) >= 12 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  insert into public.family_members (group_id, user_id, role, display_name)
    values (inv.group_id, auth.uid(), 'member', p_display_name)
    on conflict (group_id, user_id) do nothing;
  update public.family_invites set used_by = auth.uid(), used_at = now() where token = p_token;
  return inv.group_id;
end $$;
revoke execute on function public.create_family_group(text, text), public.accept_family_invite(text, text) from public, anon;
grant execute on function public.create_family_group(text, text), public.accept_family_invite(text, text) to authenticated;

-- ───────────────────────── Bildirim tercihleri ve push belirteçleri ─────────────────────────
create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  quakes_enabled boolean not null default true,
  min_magnitude numeric(2, 1) not null default 4.0 check (min_magnitude between 2.0 and 7.0),
  -- Takip edilen bölge (yaklaşık). Null ise yalnızca ülke çapında büyük olaylar.
  region_lat double precision check (region_lat between -90 and 90),
  region_lon double precision check (region_lon between -180 and 180),
  region_radius_km integer not null default 150 check (region_radius_km between 10 and 1000),
  family_enabled boolean not null default true,
  -- Aynı bölgede art arda gelen olaylar için en kısa bildirim aralığı
  min_interval_minutes integer not null default 10 check (min_interval_minutes between 0 and 240),
  updated_at timestamptz not null default now()
);
create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── Hesap verisi dışa aktarma ─────────────────────────
create or replace function public.export_my_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'reports', coalesce((select jsonb_agg(to_jsonb(r) - 'author_id') from public.user_reports r where r.author_id = auth.uid()), '[]'),
    'family_memberships', coalesce((select jsonb_agg(to_jsonb(m)) from public.family_members m where m.user_id = auth.uid()), '[]'),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c)) from public.safety_checkins c where c.user_id = auth.uid()), '[]'),
    'notification_preferences', (select to_jsonb(n) from public.notification_preferences n where n.user_id = auth.uid()),
    'exported_at', now()
  );
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
