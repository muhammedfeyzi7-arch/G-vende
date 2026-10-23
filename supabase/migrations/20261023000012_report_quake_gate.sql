-- Olay bildirimi yalnızca deprem sonrası: bildirim yerinin yakınında son 72 saatte AFAD veya Kandilli'nin
-- kaydettiği M4+ bir deprem olmalıdır (yarıçap büyüklükle artar: M4 ≈ 40 km, M5 ≈ 80 km, M6 ≈ 160 km, en fazla 400 km).
-- Kurumsal hesaplar (official/rescue) muaftır. Aynı kural uygulamada da uygulanır (src/features/reports/quakeGate.ts).
create or replace function public.has_recent_quake_near(lat double precision, lon double precision) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.earthquake_readings r
     where r.source in ('afad', 'kandilli')
       and r.magnitude >= 4.0
       and r.occurred_at > now() - interval '72 hours'
       and r.occurred_at <= now() + interval '5 minutes'
       and public.distance_m(lat, lon, r.latitude, r.longitude) <= least(400000, 20000 * power(2, r.magnitude - 3))
  )
$$;
revoke execute on function public.has_recent_quake_near(double precision, double precision) from public, anon, authenticated;

create or replace function public.user_reports_quake_gate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- user_reports_before_insert (ad sırasıyla önce çalışır) konumu precise_* alanlarına taşımıştır.
  if new.author_role is not null then
    return new; -- kurumsal hesap
  end if;
  if new.precise_latitude is null then
    raise exception 'quake_location_required' using errcode = 'P0001',
      hint = 'Bölgenizde deprem olup olmadığını doğrulamak için konum gerekir.';
  end if;
  if not public.has_recent_quake_near(new.precise_latitude, new.precise_longitude) then
    raise exception 'no_recent_quake' using errcode = 'P0001',
      hint = 'Olay bildirimi yalnızca bölgenizde yakın zamanda deprem kaydedildiğinde açılır.';
  end if;
  return new;
end $$;
revoke execute on function public.user_reports_quake_gate() from public, anon, authenticated;
drop trigger if exists user_reports_quake_gate on public.user_reports;
create trigger user_reports_quake_gate before insert on public.user_reports
  for each row execute function public.user_reports_quake_gate();
