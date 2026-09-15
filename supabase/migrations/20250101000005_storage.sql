-- Elo Mídia — bucket de anexos e políticas de acesso.
-- Caminho dos objetos: {church_id}/{content_id}/{kind}/{arquivo}
-- kind = 'publicavel' | 'referencia' (mesma regra de permissão usada em public.attachments).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  52428800, -- 50 MB — vídeos grandes devem usar link externo de referência
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy attachments_bucket_select on storage.objects
  for select using (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy attachments_bucket_insert on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid)
    and (
      ((storage.foldername(name))[3] = 'referencia' and public.can_view_content(((storage.foldername(name))[2])::uuid))
      or ((storage.foldername(name))[3] = 'publicavel' and public.can_edit_content(((storage.foldername(name))[2])::uuid))
    )
  );

create policy attachments_bucket_delete on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (
      owner = auth.uid()
      or public.can_edit_content(((storage.foldername(name))[2])::uuid)
    )
  );
