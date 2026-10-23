-- Toplanma alanı karoları ve veri seti sürümü.
begin;
insert into public.assembly_points (name, latitude, longitude, source_name, source_url, source_record_id, province)
values ('Konak Meydanı', 38.4189, 27.1287, 'test', 'https://example.org', 'T1', 'İzmir'),
       ('Uzak', 41.0, 29.0, 'test', 'https://example.org', 'T2', 'İstanbul');

do $$
declare x int; y int; n int; v0 bigint; v1 bigint;
begin
  select tile_x, tile_y into x, y from public.assembly_points where source_record_id = 'T1';
  -- Konak (38.4189, 27.1287) z11 karosu: x = floor((27.1287+180)/360*2048) = 1178
  if x <> 1178 then raise exception 'tile_x yanlış: %', x; end if;
  if y <> 786 then raise exception 'tile_y yanlış: %', y; end if;

  select count(*) into n from public.assembly_points_in_tiles(array[x], array[y]);
  if n <> 1 then raise exception 'karo sorgusu % satır döndü (1 beklenirdi)', n; end if;
  select count(*) into n from public.assembly_points_in_tiles(array[x, 0], array[y, 0]);
  if n <> 1 then raise exception 'boş karo sonucu bozdu: %', n; end if;

  select version into v0 from public.dataset_versions where name = 'assembly_points';
  update public.assembly_points set capacity = 100 where source_record_id like 'T%';
  select version into v1 from public.dataset_versions where name = 'assembly_points';
  if v1 <> v0 + 1 then raise exception 'sürüm deyim başına bir artmalı: % → %', v0, v1; end if;
end $$;

-- anon sürümü okuyabilir ama yazamaz.
set local role anon;
select version from public.dataset_versions where name = 'assembly_points';
do $$ begin
  update public.dataset_versions set version = 999;
  if exists (select 1 from public.dataset_versions where version = 999) then raise exception 'anon sürümü değiştirdi'; end if;
exception when insufficient_privilege then null; end $$;
reset role;
rollback;
