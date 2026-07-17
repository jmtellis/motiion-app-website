-- Project media storage bucket for cover images and attachments

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  true,
  20971520,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "project_media_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-media');

CREATE POLICY "project_media_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = lower(auth.uid()::text)
);

CREATE POLICY "project_media_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = lower(auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = lower(auth.uid()::text)
);

CREATE POLICY "project_media_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = lower(auth.uid()::text)
);
