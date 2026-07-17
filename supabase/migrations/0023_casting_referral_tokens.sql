-- Anonymous / shareable referral tokens + nullable referrer support

CREATE TABLE IF NOT EXISTS public.casting_referral_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_id UUID NOT NULL REFERENCES public.castings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS casting_referral_tokens_casting_idx
  ON public.casting_referral_tokens (casting_id, created_at DESC);

CREATE INDEX IF NOT EXISTS casting_referral_tokens_token_idx
  ON public.casting_referral_tokens (token)
  WHERE revoked_at IS NULL;

ALTER TABLE public.casting_referral_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS casting_referral_tokens_select ON public.casting_referral_tokens;
CREATE POLICY casting_referral_tokens_select ON public.casting_referral_tokens
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

DROP POLICY IF EXISTS casting_referral_tokens_insert ON public.casting_referral_tokens;
CREATE POLICY casting_referral_tokens_insert ON public.casting_referral_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND project_id IN (SELECT public.user_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS casting_referral_tokens_update ON public.casting_referral_tokens;
CREATE POLICY casting_referral_tokens_update ON public.casting_referral_tokens
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT public.user_project_ids(auth.uid())))
  WITH CHECK (project_id IN (SELECT public.user_project_ids(auth.uid())));

-- Allow anonymous submissions via service role (no public INSERT policy)
ALTER TABLE public.casting_referrals
  ALTER COLUMN referrer_user_id DROP NOT NULL;

ALTER TABLE public.casting_referrals
  ADD COLUMN IF NOT EXISTS referral_token_id UUID REFERENCES public.casting_referral_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referrer_display_name TEXT,
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'authenticated';

CREATE INDEX IF NOT EXISTS casting_referrals_token_idx
  ON public.casting_referrals (referral_token_id, created_at DESC);

-- Authenticated inserts still require a signed-in referrer
DROP POLICY IF EXISTS casting_referrals_insert ON public.casting_referrals;
CREATE POLICY casting_referrals_insert ON public.casting_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    referrer_user_id = auth.uid()
    AND (source IS NULL OR source = 'authenticated')
    AND referred_profile_id NOT IN (
      SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.castings c
      WHERE c.id = casting_id
        AND c.status IN ('open', 'published')
    )
  );
