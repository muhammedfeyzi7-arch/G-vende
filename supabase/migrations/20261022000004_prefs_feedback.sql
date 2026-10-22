-- Ayarlar ekranındaki ek bildirim tercihleri ve uygulama içi geri bildirim.
alter table public.notification_preferences
  add column if not exists official_enabled boolean not null default true,
  add column if not exists community_enabled boolean not null default false;

-- Geri bildirim: kullanıcı yalnızca yazabilir, okuyamaz (yalnızca service_role/yöneticiler okur).
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  message text not null check (char_length(message) between 3 and 2000),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant insert (message, app_version, platform) on public.feedback to authenticated;
create policy feedback_insert_own on public.feedback for insert to authenticated with check (user_id = auth.uid());

-- Kötüye kullanım: kullanıcı başına günde en fazla 5 geri bildirim.
create or replace function public.feedback_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  if (select count(*) from public.feedback where user_id = new.user_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger feedback_before_insert before insert on public.feedback for each row execute function public.feedback_before_insert();
