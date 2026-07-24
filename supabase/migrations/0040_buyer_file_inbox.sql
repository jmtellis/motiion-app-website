-- Buyer file inbox: unassigned files staged until assigned to a project

CREATE TABLE IF NOT EXISTS public.buyer_file_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buyer_file_inbox_owner_created_idx
  ON public.buyer_file_inbox (owner_id, created_at DESC);

ALTER TABLE public.buyer_file_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY buyer_file_inbox_owner ON public.buyer_file_inbox
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Allow any desktop file type in project-media (inbox + future attachments)
UPDATE storage.buckets
SET
  allowed_mime_types = NULL,
  file_size_limit = 20971520
WHERE id = 'project-media';
