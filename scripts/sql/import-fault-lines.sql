-- Aktif fay hatları: GEM Global Active Faults Database (CC BY-SA 4.0) → public.fault_lines
-- Türkiye kutusundaki (25.5–45°D, 35.5–42.5°K) çizgiler; koordinatlar ~100 m'ye yuvarlanır.
-- Resmî MTA Diri Fay Haritası DEĞİLDİR (EMME/SHARE bölgesel modelleri). Uygulamada kaynak gösterilir.
--
-- 1) İndir (pg_net; ~10 MB, birkaç saniye sonra net._http_response'ta):
--    select net.http_get('https://raw.githubusercontent.com/GEMScienceTools/gem-global-active-faults/master/geojson/gem_active_faults_harmonized.geojson', timeout_milliseconds := 120000);
-- 2) :gem_id yerine yanıt kimliğini yazıp çalıştırın (yeniden çalıştırmak güvenli; sürüm artar,
--    uygulamalar bir sonraki açılışta yeni veriyi indirir).
with f as (
  select ft, row_number() over () rn
  from net._http_response r, jsonb_array_elements(r.content::jsonb->'features') ft
  where r.id = :gem_id and ft->'geometry'->>'type' = 'LineString'
), tr as (
  select ft, rn,
    (select avg((p->>1)::float8) from jsonb_array_elements(ft->'geometry'->'coordinates') p) lat,
    (select avg((p->>0)::float8) from jsonb_array_elements(ft->'geometry'->'coordinates') p) lon
  from f
), rows as (
  select row_number() over (order by rn) i, nullif(ft->'properties'->>'slip_type', '') slip, ft->'properties'->>'catalog_name' cat,
    (select jsonb_agg(jsonb_build_array(round((p->>0)::numeric, 3), round((p->>1)::numeric, 3))) from jsonb_array_elements(ft->'geometry'->'coordinates') p) c
  from tr where lat between 35.5 and 42.5 and lon between 25.5 and 45
)
insert into public.fault_lines (id, slip_type, catalog, coords)
select i, slip, cat, c from rows
on conflict (id) do update set slip_type = excluded.slip_type, catalog = excluded.catalog, coords = excluded.coords, imported_at = now();
-- 2026-10-23 sonucu: 412 çizgi (EMME 400, SHARE 12).
