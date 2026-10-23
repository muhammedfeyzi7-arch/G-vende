-- Aktif fay hatları (harita katmanı). Kaynak: GEM Global Active Faults Database (CC BY-SA 4.0),
-- Türkiye kutusundaki çizgiler (çoğu EMME — Orta Doğu Deprem Modeli; SHARE). Resmî MTA Diri Fay
-- Haritası DEĞİLDİR; genelleştirilmiş bölgesel modeldir. İçe aktarma: scripts/sql/import-fault-lines.sql
create table if not exists public.fault_lines (
  id int primary key,
  slip_type text,
  catalog text,
  -- [[boylam, enlem], ...] (~100 m'ye yuvarlanmış)
  coords jsonb not null,
  imported_at timestamptz not null default now()
);
alter table public.fault_lines enable row level security;
drop policy if exists fault_lines_read on public.fault_lines;
create policy fault_lines_read on public.fault_lines for select using (true);

-- Uygulama veriyi bir kez indirip saklar; yalnızca sürüm değişince yeniden indirir.
insert into public.dataset_versions (name) values ('fault_lines') on conflict do nothing;

create or replace function public.bump_fault_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.dataset_versions set version = version + 1, updated_at = now() where name = 'fault_lines';
  return null;
end $$;
revoke execute on function public.bump_fault_version() from public, anon, authenticated;

drop trigger if exists fault_lines_bump_version on public.fault_lines;
create trigger fault_lines_bump_version
  after insert or update or delete on public.fault_lines
  for each statement execute function public.bump_fault_version();
