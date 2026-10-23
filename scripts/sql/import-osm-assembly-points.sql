-- Resmî açık verisi olmayan iller için OpenStreetMap'teki toplanma alanları (emergency=assembly_point).
-- Bunlar RESMÎ DEĞİLDİR: source_kind = 'community' ile saklanır ve uygulamada öyle etiketlenir.
-- Lisans: ODbL — "© OpenStreetMap katkıcıları" atfı gerekir (uygulamada kaynak satırında gösterilir).
--
-- 1) İndir (Overpass, GET; yoğunlukta 502 dönebilir, birkaç dakika sonra tekrar deneyin):
--    select net.http_get(url := 'https://overpass-api.de/api/interpreter',
--      params := jsonb_build_object('data', '[out:json][timeout:120];area["ISO3166-1"="TR"][admin_level=2]->.tr;nwr["emergency"="assembly_point"](area.tr);out center tags;'),
--      timeout_milliseconds := 150000);
-- 2) :osm_id yerine yanıt kimliğini yazıp çalıştırın. Yeniden çalıştırmak güvenlidir (upsert).
-- Resmî bir noktaya ~100 m'den yakın OSM kayıtları alınmaz (haritada çift nokta olmasın).

with els as (
  select e from net._http_response r, jsonb_array_elements(r.content::jsonb->'elements') e where r.id = :osm_id
), pts as (
  select
    e->>'type' as typ, e->>'id' as oid,
    coalesce((e->>'lat')::float8, (e->'center'->>'lat')::float8) as lat,
    coalesce((e->>'lon')::float8, (e->'center'->>'lon')::float8) as lon,
    e->'tags' as t
  from els
), rows as (
  select distinct on (oid, typ) * from pts
  where lat between 35.5 and 42.5 and lon between 25.5 and 45.0
)
insert into public.assembly_points
  (name, address, province, district, neighborhood, latitude, longitude, capacity,
   source_name, source_url, source_record_id, source_published_at, source_kind)
select
  left(coalesce(nullif(trim(t->>'name:tr'), ''), nullif(trim(t->>'name'), ''), 'Toplanma alanı (adsız)'), 200),
  nullif(concat_ws(' ', t->>'addr:street', t->>'addr:housenumber'), ''),
  coalesce(t->>'addr:province', t->>'is_in:province'),
  coalesce(t->>'addr:district', t->>'addr:city'),
  coalesce(t->>'addr:suburb', t->>'addr:neighbourhood'),
  lat, lon,
  case when (t->>'capacity') ~ '^\d{1,6}$' then (t->>'capacity')::int end,
  'OpenStreetMap katkıcıları (ODbL)',
  'https://www.openstreetmap.org/' || typ || '/' || oid,
  'osm:' || typ || '/' || oid,
  current_date,
  'community'
from rows r
where not exists (
  select 1 from public.assembly_points o
  where o.source_kind = 'official'
    and o.latitude between r.lat - 0.0009 and r.lat + 0.0009
    and o.longitude between r.lon - 0.0012 and r.lon + 0.0012
)
on conflict (source_name, source_record_id) do update set
  name = excluded.name, address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude,
  capacity = excluded.capacity, source_published_at = excluded.source_published_at, imported_at = now();
