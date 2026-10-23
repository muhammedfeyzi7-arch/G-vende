-- Alan (Polygon/MultiPolygon) olarak yayımlanan resmî toplanma alanlarını içe aktarır: Konya ve Bursa BB.
-- 1) Sunucudan indir (pg_net; birkaç saniye sonra net._http_response'ta görünür):
--    select net.http_get('https://acikveri.konya.bel.tr/dataset/9f5ca4ac-9793-48b0-b3e6-674ad9e0a201/resource/da48885b-a927-4579-b9a9-395115519f86/download/19_202103_toplanma_alanlari.geojson', timeout_milliseconds := 60000);
--    select net.http_get('https://bapi.bursa.bel.tr/apigateway/bbbAcikVeri_Cbs/Toplanma_yerleri', timeout_milliseconds := 60000);
-- 2) Aşağıdaki :konya_id / :bursa_id yerine yanıt kimliklerini yazıp çalıştırın.
-- Nokta = alanın dış halkasındaki köşelerin ortalaması (birkaç yüz metrelik alanlarda merkeze yeterince yakın).

with src as (
  select 'konya' as city, content::jsonb as j from net._http_response where id = :konya_id
  union all
  select 'bursa', content::jsonb from net._http_response where id = :bursa_id
), f as (
  select s.city, ft->'properties' as p,
         case ft->'geometry'->>'type'
           when 'Polygon' then ft->'geometry'->'coordinates'->0
           when 'MultiPolygon' then ft->'geometry'->'coordinates'->0->0
         end as ring
  from src s, jsonb_array_elements(s.j->'features') ft
), c as (
  select city, p,
         (select avg((v->>1)::float8) from jsonb_array_elements(ring) v) as lat,
         (select avg((v->>0)::float8) from jsonb_array_elements(ring) v) as lon
  from f where ring is not null
), rows as (
  -- Aynı kayıt kimliği bir kez (ON CONFLICT aynı satırı iki kez güncelleyemez).
  select distinct on (src_name, rec_id) * from (
    select
      regexp_replace(trim(coalesce(p->>'ADI', p->>'ad')), '\s+', ' ', 'g') nm,
      case city when 'konya' then 'Konya' else coalesce(p->>'il', 'BURSA') end prov,
      p->>'ilce' ilce, p->>'mahalle' mah, lat, lon,
      case city when 'konya' then 'Konya Büyükşehir Belediyesi Açık Veri' else 'Bursa Büyükşehir Belediyesi Açık Veri' end src_name,
      case city when 'konya' then 'https://acikveri.konya.bel.tr/dataset/toplanma-alanlari'
                else 'https://acikyesil.bursa.bel.tr/dataset/toplanma-alanlari' end src_url,
      case city when 'konya' then coalesce(p->>'ADI', 'kayitsiz') || '@' || round(lat::numeric, 5) || ',' || round(lon::numeric, 5)
                else coalesce(p->>'id', round(lat::numeric, 5) || ',' || round(lon::numeric, 5)) end rec_id,
      case city when 'konya' then date '2021-03-01' else date '2025-02-27' end pub
    from c
    where lat between 35.5 and 42.5 and lon between 25.5 and 45.0
      and nullif(trim(coalesce(p->>'ADI', p->>'ad')), '') is not null
  ) x
)
insert into public.assembly_points
  (name, province, district, neighborhood, latitude, longitude, source_name, source_url, source_record_id, source_published_at, source_kind)
select nm, prov, ilce, mah, lat, lon, src_name, src_url, rec_id, pub, 'official' from rows
on conflict (source_name, source_record_id) do update set
  name = excluded.name, province = excluded.province, district = excluded.district, neighborhood = excluded.neighborhood,
  latitude = excluded.latitude, longitude = excluded.longitude, source_published_at = excluded.source_published_at,
  imported_at = now();
-- 2026-10-23 sonucu: Bursa 1206 nokta (17 ilçe), Konya 125 nokta.
