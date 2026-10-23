-- GÜVENDE RLS testleri. Her blok bir beklentiyi doğrular; başarısızlık exception fırlatır.
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ayse@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'mehmet@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'yabanci@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.test'),
  ('00000000-0000-0000-0000-00000000000e', 'e@example.test');

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
set client_min_messages = notice;

-- Güven katmanı (0005): bildirim için kimlik doğrulaması gerekir; bu testlerde herkes doğrulanmış.
insert into public.profiles (id, identity_verified_at)
  select id, now() - interval '2 days' from auth.users;

-- 1) Bildirim oluşturma, konum yuvarlama, yazar kimliğinin gizliliği
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.user_reports (client_id, category, felt_intensity, description, latitude, longitude, area_label,
                                 device_latitude, device_longitude, device_accuracy_m)
values ('11111111-1111-1111-1111-111111111111', 'shake', 3, '  Sarsıntı hissettim  ', 40.771234, 30.992187, 'Düzce · Merkez',
        40.7715, 30.9925, 15);
select pg_temp.ok((select latitude = 40.77 and longitude = 30.99 from public.user_reports limit 1), 'konum ~1 km ızgaraya yuvarlandı');
select pg_temp.ok((select description = 'Sarsıntı hissettim' from public.user_reports limit 1), 'açıklama kırpıldı');

do $$ begin
  perform author_id from public.user_reports;
  raise exception 'BAŞARISIZ: author_id okunabildi';
exception when insufficient_privilege then raise notice 'OK: author_id sütunu okunamıyor';
end $$;

do $$ begin
  insert into public.user_reports (client_id, category, helpful_count) values (gen_random_uuid(), 'safe', 999);
  raise exception 'BAŞARISIZ: helpful_count yazılabildi';
exception when insufficient_privilege then raise notice 'OK: sayaç sütunları istemciden yazılamıyor';
end $$;

do $$ begin
  insert into public.user_reports (client_id, category, felt_intensity) values (gen_random_uuid(), 'safe', 2);
  raise exception 'BAŞARISIZ: sarsıntı dışı kategoride şiddet kabul edildi';
exception when check_violation then raise notice 'OK: şiddet yalnızca sarsıntı bildiriminde';
end $$;

-- 2) Hız sınırı: 10 dakikada en fazla 3
insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'safe');
insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'safe');
do $$ begin
  insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'safe');
  raise exception 'BAŞARISIZ: hız sınırı uygulanmadı';
exception when raise_exception then
  if sqlerrm = 'rate_limited' then raise notice 'OK: hız sınırı (3/10 dk)'; else raise; end if;
end $$;

-- 3) Aynı client_id ile tekrar gönderim reddedilir (çevrimdışı kuyruk tekilleştirmesi)
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.user_reports (client_id, category) values ('22222222-2222-2222-2222-222222222222', 'other');
do $$ begin
  insert into public.user_reports (client_id, category) values ('22222222-2222-2222-2222-222222222222', 'other');
  raise exception 'BAŞARISIZ: tekrar gönderim kabul edildi';
exception when unique_violation then raise notice 'OK: client_id tekilleştirmesi';
end $$;

-- 4) Anonim kullanıcı okuyabilir ama yazamaz
reset role;
select pg_temp.as_user('');
select pg_temp.ok((select count(*) = 4 from public.user_reports), 'anonim kullanıcı görünür bildirimleri okuyabilir');
do $$ begin
  insert into public.user_reports (client_id, category) values (gen_random_uuid(), 'safe');
  raise exception 'BAŞARISIZ: anonim yazdı';
exception when insufficient_privilege then raise notice 'OK: anonim bildirim yazamaz';
end $$;

-- 5) Başkasının bildirimini silememe
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
delete from public.user_reports where description = 'Sarsıntı hissettim';
reset role;
select pg_temp.ok((select count(*) = 1 from public.user_reports where description = 'Sarsıntı hissettim'), 'başkasının bildirimi silinemedi');

-- 6) Faydalı bulma sayacı ve tek oy
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.report_reactions (report_id) select id from public.user_reports where description = 'Sarsıntı hissettim';
do $$ begin
  insert into public.report_reactions (report_id) select id from public.user_reports where description = 'Sarsıntı hissettim';
  raise exception 'BAŞARISIZ: ikinci oy';
exception when unique_violation then raise notice 'OK: kullanıcı başına tek faydalı oyu';
end $$;
select pg_temp.ok((select helpful_count = 1 from public.user_reports where description = 'Sarsıntı hissettim'), 'faydalı sayacı arttı');

-- 7) Moderasyon: 3 farklı işaret → gizlenir
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.moderation_reports (report_id, reason) select id, 'spam' from public.user_reports where category = 'other';
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.moderation_reports (report_id, reason) select id, 'spam' from public.user_reports where category = 'other';
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.moderation_reports (report_id, reason) select id, 'false_info' from public.user_reports where category = 'other';
select pg_temp.ok((select count(*) = 0 from public.user_reports where category = 'other'), '3 işaretten sonra bildirim akıştan gizlendi');
reset role;
select pg_temp.ok((select status = 'hidden' from public.user_reports where category = 'other'), 'durum hidden');

-- 8) Fotoğraf: yalnızca kendi bildirimine ve kendi klasörüne
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  insert into public.report_media (report_id, storage_path, captured_at)
    select id, '00000000-0000-0000-0000-00000000000c/x.jpg', now() from public.user_reports where description = 'Sarsıntı hissettim';
  raise exception 'BAŞARISIZ: başkasının bildirimine fotoğraf eklendi';
exception when insufficient_privilege then raise notice 'OK: başkasının bildirimine fotoğraf eklenemez';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.report_media (report_id, storage_path, captured_at)
    select id, '00000000-0000-0000-0000-00000000000c/x.jpg', now() from public.user_reports where description = 'Sarsıntı hissettim';
  raise exception 'BAŞARISIZ: başka kullanıcının klasör yolu kabul edildi';
exception when insufficient_privilege then raise notice 'OK: depolama yolu kullanıcı klasörüyle sınırlı';
end $$;
insert into public.report_media (report_id, storage_path, captured_at)
  select id, '00000000-0000-0000-0000-00000000000a/1.jpg', now() from public.user_reports where description = 'Sarsıntı hissettim';
do $$ begin
  insert into storage.objects (bucket_id, name) values ('report-media', '00000000-0000-0000-0000-00000000000c/evil.jpg');
  raise exception 'BAŞARISIZ: başka klasöre yükleme';
exception when insufficient_privilege then raise notice 'OK: depolamada başka kullanıcının klasörüne yükleme engellendi';
end $$;
insert into storage.objects (bucket_id, name) values ('report-media', '00000000-0000-0000-0000-00000000000a/1.jpg');
reset role;
select pg_temp.as_user('');
select pg_temp.ok((select count(*) = 1 from storage.objects where name = '00000000-0000-0000-0000-00000000000a/1.jpg'), 'görünür bildirimin fotoğrafı okunabilir');

-- 9) Aile grubu erişim kontrolleri
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_family_group('Yılmaz Ailesi', 'Ayşe') as gid \gset
insert into public.family_invites (group_id) values (:'gid') returning token as tok \gset

reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.ok((select count(*) = 0 from public.family_groups), 'üye olmayan grubu göremez');
select pg_temp.ok((select count(*) = 0 from public.family_members), 'üye olmayan üyeleri göremez');
select pg_temp.ok((select count(*) = 0 from public.family_invites), 'üye olmayan davetleri göremez');
reset role;
select set_config('my.gid', :'gid', false), set_config('my.tok', :'tok', false);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  insert into public.safety_checkins (group_id, status) values (current_setting('my.gid')::uuid, 'safe');
  raise exception 'BAŞARISIZ: üye olmayan durum bildirdi';
exception when insufficient_privilege then raise notice 'OK: üye olmayan gruba durum bildiremez';
end $$;
do $$ begin
  insert into public.family_members (group_id, user_id, display_name)
    values (current_setting('my.gid')::uuid, auth.uid(), 'Sızan');
  raise exception 'BAŞARISIZ: kendini gruba ekledi';
exception when insufficient_privilege then raise notice 'OK: davet olmadan gruba katılınamaz';
end $$;

reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.accept_family_invite(:'tok', 'Mehmet');
select pg_temp.ok((select count(*) = 2 from public.family_members), 'davetle katılan üye grubu görür');
do $$ begin
  update public.family_members set role = 'owner' where user_id = auth.uid();
  raise exception 'BAŞARISIZ: rol yükseltildi';
exception when insufficient_privilege then raise notice 'OK: üye kendi rolünü yükseltemez';
end $$;
-- Konum paylaşımı kapalıyken konum saklanmaz
insert into public.safety_checkins (group_id, status, latitude, longitude) values (:'gid', 'safe', 40.1, 29.1);
select pg_temp.ok((select latitude is null from public.safety_checkins where user_id = auth.uid()), 'paylaşım kapalıyken konum atıldı');
update public.family_members set share_location = true where user_id = auth.uid();
insert into public.safety_checkins (group_id, status, latitude, longitude) values (:'gid', 'need_help', 40.1, 29.1);
select pg_temp.ok((select count(*) = 1 from public.safety_checkins where latitude is not null), 'paylaşım açıkken konum saklandı');

reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  perform public.accept_family_invite(current_setting('my.tok'), 'Tekrar');
  raise exception 'BAŞARISIZ: kullanılmış davet tekrar kullanıldı';
exception when raise_exception then
  if sqlerrm = 'invite_invalid' then raise notice 'OK: kullanılmış davet geçersiz'; else raise; end if;
end $$;
select pg_temp.ok((select count(*) = 0 from public.safety_checkins), 'yabancı durum bildirimlerini göremez');

-- 10) Bildirim tercihleri ve push belirteçleri yalnızca sahibine
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.notification_preferences (min_magnitude) values (4.5);
insert into public.push_tokens (token, platform) values ('ExponentPushToken[a]', 'ios');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.ok((select count(*) = 0 from public.notification_preferences), 'başkasının tercihleri görünmez');
select pg_temp.ok((select count(*) = 0 from public.push_tokens), 'başkasının push belirteci görünmez');
do $$ begin
  insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[x]', '00000000-0000-0000-0000-00000000000a', 'ios');
  raise exception 'BAŞARISIZ: başkası adına belirteç';
exception when insufficient_privilege then raise notice 'OK: başkası adına push belirteci yazılamaz';
end $$;

-- 11) Resmî veri tabloları istemciden yazılamaz
do $$ begin
  insert into public.assembly_points (name, latitude, longitude, source_name, source_url) values ('Sahte', 1, 1, 'x', 'x');
  raise exception 'BAŞARISIZ: toplanma alanı yazıldı';
exception when insufficient_privilege then raise notice 'OK: toplanma alanları istemciden yazılamaz';
end $$;
do $$ begin
  insert into public.earthquake_readings (source, source_event_id, latitude, longitude, occurred_at) values ('afad', 'x', 1, 1, now());
  raise exception 'BAŞARISIZ: deprem kaydı yazıldı';
exception when insufficient_privilege then raise notice 'OK: deprem kayıtları istemciden yazılamaz';
end $$;

-- 12) Veri dışa aktarma yalnızca kendi verisi
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.ok((select jsonb_array_length(public.export_my_data() -> 'reports') = 3), 'dışa aktarma yalnızca kendi bildirimlerini içerir');
select pg_temp.ok((select not (public.export_my_data() -> 'reports' -> 0 ? 'author_id')), 'dışa aktarımda author_id yok');
-- 13) Geri bildirim: yazılabilir, okunamaz; günlük sınır
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.feedback (message, platform) values ('Harika uygulama', 'ios');
do $$ begin
  perform count(*) from public.feedback;
  raise exception 'BAŞARISIZ: geri bildirim okunabildi';
exception when insufficient_privilege then raise notice 'OK: geri bildirimler kullanıcıya okunamaz';
end $$;
insert into public.feedback (message) values ('iki'), ('üçüncü'), ('dördüncü'), ('beşinci');
do $$ begin
  insert into public.feedback (message) values ('altıncı');
  raise exception 'BAŞARISIZ: geri bildirim sınırı yok';
exception when raise_exception then
  if sqlerrm = 'rate_limited' then raise notice 'OK: geri bildirim günlük sınırı'; else raise; end if;
end $$;
reset role;
select pg_temp.as_user('');
do $$ begin
  insert into public.feedback (message) values ('anonim');
  raise exception 'BAŞARISIZ: anonim geri bildirim';
exception when insufficient_privilege then raise notice 'OK: anonim geri bildirim yazamaz';
end $$;
reset role;
\echo 'TÜM RLS TESTLERİ GEÇTİ'
