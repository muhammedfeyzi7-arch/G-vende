-- Bildirim fotoğrafları: herkese açık olmayan kova. Okuma yalnızca imzalı URL ile,
-- ve yalnızca görünür bir bildirime bağlı dosyalar için.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-media', 'report-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy report_media_upload_own_folder on storage.objects for insert to authenticated
  with check (bucket_id = 'report-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy report_media_read_visible on storage.objects for select to anon, authenticated
  using (bucket_id = 'report-media' and public.media_path_visible(name));

create policy report_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'report-media' and (storage.foldername(name))[1] = auth.uid()::text);
