-- Dördüncü deprem kaynağı: EMSC (Avrupa-Akdeniz Sismoloji Merkezi, FDSN).
alter table public.earthquake_readings drop constraint earthquake_readings_source_check;
alter table public.earthquake_readings add constraint earthquake_readings_source_check
  check (source in ('afad', 'kandilli', 'usgs', 'emsc'));
