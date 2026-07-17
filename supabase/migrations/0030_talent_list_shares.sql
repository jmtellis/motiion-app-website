-- Shareable collection / roster links
CREATE TABLE IF NOT EXISTS public.talent_list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.talent_lists(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  title TEXT,
  message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  expiration_kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.talent_list_share_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.talent_list_shares(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS talent_list_shares_owner_idx ON public.talent_list_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS talent_list_shares_list_idx ON public.talent_list_shares(list_id);
CREATE INDEX IF NOT EXISTS talent_list_shares_token_idx ON public.talent_list_shares(token);
CREATE INDEX IF NOT EXISTS talent_list_share_recipients_share_idx ON public.talent_list_share_recipients(share_id);

ALTER TABLE public.talent_list_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_list_share_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY talent_list_shares_owner ON public.talent_list_shares
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY talent_list_share_recipients_owner ON public.talent_list_share_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.talent_list_shares s
      WHERE s.id = share_id AND s.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_list_shares s
      WHERE s.id = share_id AND s.owner_user_id = auth.uid()
    )
  );

-- Public read of active non-expired shares by token (anonymous reviewers)
CREATE POLICY talent_list_shares_public_read ON public.talent_list_shares
  FOR SELECT USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );
