-- Deprem senkronizasyonu (0008, 0010): herkes okur, istemci yazamaz.
\set ON_ERROR_STOP on
set client_min_messages = notice;
reset role;
insert into public.quake_sync_state (source, status, last_success_at) values ('afad', 'ok', now()) on conflict do nothing;
insert into public.earthquake_readings (source, source_event_id, magnitude, latitude, longitude, occurred_at)
  values ('emsc', 'T-1', 3.1, 40, 30, now()) on conflict do nothing;

set role anon;
do $$ begin
  if (select count(*) from public.quake_sync_state where source = 'afad') <> 1 then raise exception 'BAŞARISIZ: senkron durumu okunamadı'; end if;
  if (select count(*) from public.earthquake_readings where source = 'emsc') <> 1 then raise exception 'BAŞARISIZ: EMSC okuması okunamadı'; end if;
  raise notice 'OK: senkron durumu ve okumalar herkese açık okunur';
end $$;
do $$ begin
  update public.quake_sync_state set status = 'error';
  raise exception 'BAŞARISIZ: anon senkron durumunu değiştirebildi';
exception when insufficient_privilege then raise notice 'OK: senkron durumu istemciden yazılamaz';
end $$;
do $$ begin
  insert into public.earthquake_readings (source, source_event_id, latitude, longitude, occurred_at) values ('afad', 'sahte', 1, 1, now());
  raise exception 'BAŞARISIZ: anon sahte deprem kaydı ekleyebildi';
exception when insufficient_privilege then raise notice 'OK: deprem kaydı istemciden eklenemez';
end $$;
reset role;
set role authenticated;
do $$ begin
  delete from public.earthquake_readings;
  raise exception 'BAŞARISIZ: oturum açmış kullanıcı deprem kaydı silebildi';
exception when insufficient_privilege then raise notice 'OK: deprem kaydı istemciden silinemez';
end $$;
reset role;
do $$ begin
  insert into public.earthquake_readings (source, source_event_id, latitude, longitude, occurred_at) values ('bilinmeyen', 'x', 1, 1, now());
  raise exception 'BAŞARISIZ: bilinmeyen kaynak kabul edildi';
exception when check_violation then raise notice 'OK: yalnızca bilinen kaynaklar (afad, kandilli, usgs, emsc)';
end $$;
select 'TÜM SENKRON TESTLERİ GEÇTİ';
