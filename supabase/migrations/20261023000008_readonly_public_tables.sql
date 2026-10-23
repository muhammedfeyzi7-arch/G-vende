-- Herkese açık okunabilen tablolar istemciden asla yazılmaz (yalnızca sunucu işlevleri/service_role).
-- RLS zaten yazmayı engelliyor; bu, yanlış bir politikaya karşı ikinci savunma hattıdır.
revoke insert, update, delete, truncate, references, trigger on public.earthquake_readings from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.assembly_points from anon, authenticated;
