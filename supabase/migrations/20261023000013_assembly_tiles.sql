-- Toplanma alanları: karo (tile) tabanlı okuma + veri seti sürümü.
-- Uygulama tüm Türkiye'yi indirmez; haritada görünen karoları TEK istekte ister, cihazda saklar ve
-- yalnızca veri seti sürümü değişince yeniler. Sürüm satırı Realtime ile yayınlanır (büyük tablonun
-- kendisi değil), böylece yeni il içe aktarıldığında açık uygulamalar önbelleklerini geçersiz kılar.

-- Kaynak türü: 'official' = belediye/AFAD açık verisi; 'community' = OpenStreetMap (topluluk).
alter table public.assembly_points
  add column if not exists source_kind text not null default 'official'
    check (source_kind in ('official', 'community'));

-- Web Mercator karo koordinatları, yakınlaştırma 11 (Türkiye'de bir karo ≈ 15 × 15 km).
alter table public.assembly_points
  add column if not exists tile_x int generated always as (floor((longitude + 180) / 360 * 2048)::int) stored,
  add column if not exists tile_y int generated always as (
    floor((1 - ln(tan(radians(latitude)) + 1 / cos(radians(latitude))) / pi()) / 2 * 2048)::int
  ) stored;
create index if not exists assembly_points_tile_idx on public.assembly_points (tile_x, tile_y);

-- Bir çağrıda en fazla 64 karo (N+1 yok: istemci eksik karoların hepsini birlikte ister).
create or replace function public.assembly_points_in_tiles(xs int[], ys int[])
returns table (
  id uuid, name text, address text, province text, district text, neighborhood text,
  latitude double precision, longitude double precision, capacity int,
  source_name text, source_url text, source_published_at date, imported_at timestamptz,
  source_kind text, tile_x int, tile_y int
)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name, p.address, p.province, p.district, p.neighborhood, p.latitude, p.longitude, p.capacity,
         p.source_name, p.source_url, p.source_published_at, p.imported_at, p.source_kind, p.tile_x, p.tile_y
  from unnest(xs[1:64], ys[1:64]) as t(x, y)
  join public.assembly_points p on p.tile_x = t.x and p.tile_y = t.y
$$;
grant execute on function public.assembly_points_in_tiles(int[], int[]) to anon, authenticated;

-- Veri seti sürümleri (herkese okunur, yalnızca tetikleyici yazar).
create table if not exists public.dataset_versions (
  name text primary key,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.dataset_versions enable row level security;
drop policy if exists dataset_versions_read on public.dataset_versions;
create policy dataset_versions_read on public.dataset_versions for select using (true);
insert into public.dataset_versions (name) values ('assembly_points') on conflict do nothing;

create or replace function public.bump_assembly_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.dataset_versions set version = version + 1, updated_at = now() where name = 'assembly_points';
  return null;
end $$;
revoke execute on function public.bump_assembly_version() from public, anon, authenticated;

drop trigger if exists assembly_points_bump_version on public.assembly_points;
create trigger assembly_points_bump_version
  after insert or update or delete on public.assembly_points
  for each statement execute function public.bump_assembly_version();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'dataset_versions') then
    alter publication supabase_realtime add table public.dataset_versions;
  end if;
end $$;
