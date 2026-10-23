-- İzmir Büyükşehir Belediyesi Açık Veri Portalı — "Afet ve Acil Durum Toplanma Alanları Listesi" (CSV)
-- Kaynak: https://acikveri.bizizmir.com/dataset/afet-ve-acil-durum-toplanma-alanlari
-- Lisans: İzmir Büyükşehir Belediyesi Açık Veri Lisansı (kaynak gösterilerek kullanım).
-- Kullanım (Supabase SQL düzenleyicide, iki adım; pg_net isteği asenkron tamamlanır):
--   1) select net.http_get(url := 'https://openfiles.izmir.bel.tr/100104/docs/izbb-afet-ve-acil-durum-toplanma-alanlari.csv',
--                          timeout_milliseconds := 30000);   -- dönen id'yi not edin
--   2) aşağıdaki sorguda :id yerine o değeri yazıp çalıştırın.
-- Sütunlar: ILCE;KAPINO;ENLEM;ACIKLAMA;ILCEID;MAHALLE;MAHALLEID;ADI;YOL;BOYLAM
with lines as (
  select regexp_split_to_table(replace(content, E'﻿', ''), E'\r?\n') l from net._http_response where id = :id and status_code = 200
), rows as (
  select string_to_array(l, ';') a from lines where l <> '' and l not like 'ILCE;%'
), valid as (
  select a from rows
   where array_length(a, 1) = 10 and a[3] ~ '^[0-9.]+$' and a[10] ~ '^[0-9.]+$'
     and a[3]::float between 37.5 and 39.6 and a[10]::float between 26.0 and 28.6
)
insert into public.assembly_points
  (name, address, province, district, neighborhood, latitude, longitude, source_name, source_url, source_record_id, source_published_at)
select
  nullif(trim(a[8]), ''),
  nullif(trim(concat_ws(' ', nullif(trim(a[9]), ''), case when trim(a[2]) <> '' then 'No: ' || trim(a[2]) end)), ''),
  'İZMİR',
  nullif(trim(a[1]), ''),
  nullif(trim(a[6]), ''),
  round(a[3]::numeric, 6)::float,
  round(a[10]::numeric, 6)::float,
  'İzmir Büyükşehir Belediyesi Açık Veri',
  'https://acikveri.bizizmir.com/dataset/afet-ve-acil-durum-toplanma-alanlari',
  coalesce(nullif(trim(a[4]), ''), 'kayitsiz') || '@' || round(a[3]::numeric, 6) || ',' || round(a[10]::numeric, 6),
  date '2026-10-22'
from valid
on conflict (source_name, source_record_id) do update
  set name = excluded.name, address = excluded.address, district = excluded.district, neighborhood = excluded.neighborhood,
      latitude = excluded.latitude, longitude = excluded.longitude, source_published_at = excluded.source_published_at,
      imported_at = now();
