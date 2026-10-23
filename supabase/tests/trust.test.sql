-- GÜVENDE güven katmanı testleri (0005_trust). rls.test.sql'den sonra aynı veritabanında çalışır.
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'raportor@example.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'dogrulanmamis@example.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'oy1@example.test'),
  ('00000000-0000-0000-0000-0000000000f4', 'oy2@example.test'),
  ('00000000-0000-0000-0000-0000000000f5', 'oy3@example.test'),
  ('00000000-0000-0000-0000-0000000000f6', 'uzak@example.test'),
  ('00000000-0000-0000-0000-0000000000f7', 'yalanci@example.test'),
  ('00000000-0000-0000-0000-0000000000f8', 'afad@example.test');
insert into public.profiles (id, identity_verified_at) values
  ('00000000-0000-0000-0000-0000000000f1', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f3', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f4', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f5', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f6', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f7', now() - interval '2 days');
insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-0000000000f2', 'Doğrulanmamış');
-- Kurumsal rol yalnızca service_role/yönetici tarafından atanır.
insert into public.profiles (id, role, org_name) values ('00000000-0000-0000-0000-0000000000f8', 'official', 'AFAD Düzce');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  if uid = '' then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'BAŞARISIZ: %', msg; end if;
  raise notice 'OK: %', msg;
end $$;
-- İfade belirtilen hata mesajıyla başarısız olmalı.
create or replace function pg_temp.fails(stmt text, expected text, msg text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'BAŞARISIZ: % (hata bekleniyordu: %)', msg, expected;
exception
  when raise_exception or insufficient_privilege or unique_violation then
    if sqlerrm like 'BAŞARISIZ%' then raise; end if;
    if sqlerrm <> expected and expected <> '*' then raise exception 'BAŞARISIZ: % — beklenen %, gelen %', msg, expected, sqlerrm; end if;
    raise notice 'OK: %', msg;
end $$;
set client_min_messages = notice;

-- 1) Kimlik doğrulaması olmadan bildirim yok
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select pg_temp.fails($$insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'safe')$$,
  'identity_required', 'doğrulanmamış kullanıcı bildirim gönderemez');
select pg_temp.ok((public.my_trust()->>'verified')::boolean = false, 'my_trust: doğrulanmamış');
-- Güven alanlarını kullanıcı kendisi değiştiremez
select pg_temp.fails($$update public.profiles set identity_verified_at = now() where id = auth.uid()$$,
  '*', 'kullanıcı kendini doğrulanmış işaretleyemez');
select pg_temp.fails($$update public.profiles set role = 'official' where id = auth.uid()$$,
  '*', 'kullanıcı kendine kurumsal rol veremez');
reset role;

-- 2) Konum kuralları (geofencing)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.ok((public.my_trust()->>'verified')::boolean, 'my_trust: doğrulanmış');
select pg_temp.fails($$insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'road')$$,
  'location_required', 'yol bildirimi konumsuz gönderilemez');
select pg_temp.fails($$insert into public.user_reports (client_id, category, latitude, longitude)
  values (gen_random_uuid(), 'road', 40.8400, 31.1600)$$,
  'device_location_required', 'cihaz konumu olmadan konumlu bildirim yok');
select pg_temp.fails($$insert into public.user_reports (client_id, category, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  values (gen_random_uuid(), 'road', 40.8400, 31.1600, 40.8401, 31.1601, 250)$$,
  'location_inaccurate', 'GPS doğruluğu zayıfsa reddedilir');
-- İstanbul'dan Düzce'deki bir yolu bildirme denemesi
select pg_temp.fails($$insert into public.user_reports (client_id, category, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  values (gen_random_uuid(), 'road', 40.8400, 31.1600, 41.0082, 28.9784, 10)$$,
  'too_far', 'uzaktaki bir yer bildirilemez');
insert into public.user_reports (client_id, category, description, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  values ('33333333-3333-3333-3333-333333333333', 'road', 'Yol kapandı', 40.840012, 31.160034, 40.8420, 31.1630, 12);
reset role;
select pg_temp.ok((select status = 'pending_photo' and device_latitude is null and precise_latitude = 40.840012
                     from public.user_reports where description = 'Yol kapandı'),
  'yol bildirimi fotoğraf bekliyor; cihaz konumu silindi, olay yeri tam konumu sunucuda');
select pg_temp.as_user('');
select pg_temp.ok((select count(*) = 0 from public.user_reports where description = 'Yol kapandı'), 'fotoğrafsız yol bildirimi yayında değil');
do $$ begin
  perform precise_latitude from public.user_reports;
  raise exception 'BAŞARISIZ: tam konum okunabildi';
exception when insufficient_privilege then raise notice 'OK: olay yerinin tam konumu istemciden okunamaz';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.ok((select count(*) = 1 from public.user_reports where description = 'Yol kapandı'),
  'yazar fotoğraf bekleyen kendi bildirimini görür (fotoğraf eklemek için)');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
select pg_temp.ok((select count(*) = 0 from public.user_reports where description = 'Yol kapandı'),
  'başkası fotoğraf bekleyen bildirimi göremez');
reset role;

-- 3) Yalnızca anlık kamera fotoğrafı
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.fails($$insert into public.report_media (report_id, storage_path, captured_at)
  select id, '00000000-0000-0000-0000-0000000000f1/eski.jpg', now() - interval '2 hours'
    from public.user_reports where description = 'Yol kapandı'$$,
  'photo_not_live', 'eski tarihli fotoğraf reddedilir');
select pg_temp.fails($$insert into public.report_media (report_id, storage_path)
  select id, '00000000-0000-0000-0000-0000000000f1/zamansiz.jpg'
    from public.user_reports where description = 'Yol kapandı'$$,
  'photo_not_live', 'çekim zamanı olmayan fotoğraf reddedilir');
insert into public.report_media (report_id, storage_path, captured_at)
  select id, '00000000-0000-0000-0000-0000000000f1/canli.jpg', now() - interval '30 seconds'
    from public.user_reports where description = 'Yol kapandı';
reset role;
select pg_temp.as_user('');
select pg_temp.ok((select verification = 'unverified' and confirm_count = 0 from public.user_reports where description = 'Yol kapandı'),
  'canlı fotoğraf sonrası "Geçici Bilgi" olarak yayında');
reset role;

-- 4) Topluluk doğrulaması (500 m)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 40.8400, 31.1600, 10 from public.user_reports where description = 'Yol kapandı'$$,
  'own_report', 'kendi bildirimini oylayamaz');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 40.8400, 31.1600, 10 from public.user_reports where description = 'Yol kapandı'$$,
  'identity_required', 'doğrulanmamış kullanıcı oylayamaz');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f6');
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'deny', 40.8600, 31.1600, 10 from public.user_reports where description = 'Yol kapandı'$$,
  'too_far', '500 m dışındaki kullanıcı oylayamaz (~2,2 km)');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 40.8410, 31.1605, 8 from public.user_reports where description = 'Yol kapandı';
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 40.8410, 31.1605, 8 from public.user_reports where description = 'Yol kapandı'$$,
  '*', 'aynı kişi ikinci kez oylayamaz');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f4');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 40.8395, 31.1598, 20 from public.user_reports where description = 'Yol kapandı';
reset role;
select pg_temp.as_user('');
select pg_temp.ok((select verification = 'unverified' and confirm_count = 2 from public.user_reports where description = 'Yol kapandı'),
  '2 onayda hâlâ geçici');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f5');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 40.8402, 31.1610, 15 from public.user_reports where description = 'Yol kapandı';
reset role;
select pg_temp.as_user('');
select pg_temp.ok((select verification = 'community' and confirm_count = 3 from public.user_reports where description = 'Yol kapandı'),
  '3 yakın doğrulanmış onay → "Doğrulanmış Bilgi"');
reset role;
select pg_temp.ok((select count(*) = 0 from public.report_votes where device_latitude is not null), 'oy veren cihaz konumu saklanmaz');

-- 5) Yanlış ihbar: 3 ret → kaldırılır, yazar askıya alınır
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f7');
insert into public.user_reports (client_id, category, description, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  values (gen_random_uuid(), 'help', 'Sahte yardım çağrısı', 40.8400, 31.1600, 40.8400, 31.1600, 5);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'deny', 40.8401, 31.1601, 5 from public.user_reports where description = 'Sahte yardım çağrısı';
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f4');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'deny', 40.8401, 31.1601, 5 from public.user_reports where description = 'Sahte yardım çağrısı';
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f5');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'deny', 40.8401, 31.1601, 5 from public.user_reports where description = 'Sahte yardım çağrısı';
reset role;
select pg_temp.ok((select status = 'removed' from public.user_reports where description = 'Sahte yardım çağrısı'),
  '3 "yanlış ihbar" oyu → haritadan kaldırıldı');
select pg_temp.ok((select strikes = 1 and suspended_until > now() + interval '6 days'
                     from public.profiles where id = '00000000-0000-0000-0000-0000000000f7'),
  'yazara ihlal puanı ve 7 gün askı');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f7');
select pg_temp.fails($$insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'safe')$$,
  'account_suspended', 'askıdaki hesap bildirim gönderemez');
select pg_temp.ok((public.my_trust()->>'strikes')::int = 1, 'my_trust ihlal puanını gösterir');
reset role;

-- 6) Kurumsal hesap: konum şartı yok, doğrudan "Resmî", rozet bilgisi okunur, reddedilemez
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f8');
insert into public.user_reports (client_id, category, description, latitude, longitude)
  values (gen_random_uuid(), 'road', 'D-100 Bolu Dağı kapalı', 40.7300, 31.6000);
reset role;
select pg_temp.as_user('');
select pg_temp.ok((select verification = 'official' and author_role = 'official' and author_org = 'AFAD Düzce'
                     from public.user_reports where description = 'D-100 Bolu Dağı kapalı'),
  'kurumsal bildirim fotoğraf beklemeden "Resmî" rozetle yayında');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f6');
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'deny', 40.7300, 31.6000, 5 from public.user_reports where description = 'D-100 Bolu Dağı kapalı'$$,
  'official_report', 'resmî bildirim oylanamaz');
reset role;

-- 7) Kurumsal oy ağırlığı: tek kurumsal onay eşiği doldurur
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f6');
insert into public.user_reports (client_id, category, description, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  values (gen_random_uuid(), 'help', 'Enkaz altında ses var', 40.9000, 31.2000, 40.9001, 31.2001, 6);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f8');
insert into public.report_votes (report_id, vote) select id, 'confirm' from public.user_reports where description = 'Enkaz altında ses var';
reset role;
select pg_temp.ok((select verification = 'community' from public.user_reports where description = 'Enkaz altında ses var'),
  'kurumsal hesabın onayı (ağırlık 3) bildirimi doğrular');

-- 8) Koordineli hesaplara karşı (0011): yeni doğrulanmış hesap oy veremez; aynı yazara 24 saatte en fazla 3 onay
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f9', 'yeni@example.test');
insert into public.profiles (id, identity_verified_at) values ('00000000-0000-0000-0000-0000000000f9', now() - interval '1 hour');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f5');
insert into public.user_reports (client_id, category, description, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  select gen_random_uuid(), 'help', 'Halka ' || i, 41.1000, 31.5000, 41.1001, 31.5001, 5 from generate_series(1, 3) i;
reset role;
update public.user_reports set created_at = now() - interval '20 minutes' where description like 'Halka %';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f5');
insert into public.user_reports (client_id, category, description, latitude, longitude, device_latitude, device_longitude, device_accuracy_m)
  values (gen_random_uuid(), 'help', 'Halka 4', 41.1000, 31.5000, 41.1001, 31.5001, 5);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f9');
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 41.1000, 31.5000, 5 from public.user_reports where description = 'Halka 1'$$,
  'identity_too_new', 'kimliği 24 saatten yeni doğrulanmış hesap oy veremez');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f4');
insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 41.1000, 31.5000, 5 from public.user_reports where description in ('Halka 1', 'Halka 2', 'Halka 3');
select pg_temp.fails($$insert into public.report_votes (report_id, vote, device_latitude, device_longitude, device_accuracy_m)
  select id, 'confirm', 41.1000, 31.5000, 5 from public.user_reports where description = 'Halka 4'$$,
  'collusion_limit', 'aynı yazarın bildirimlerine 24 saatte en fazla 3 onay');
reset role;
select pg_temp.ok((select verification = 'unverified' from public.user_reports where description = 'Halka 1'),
  'tek kişinin onayı topluluk eşiğini (3) doldurmaz');

\echo 'TÜM GÜVEN KATMANI TESTLERİ GEÇTİ'
