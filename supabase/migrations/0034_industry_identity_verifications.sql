-- Stripe Identity verification status for industry professionals.
-- Status rows are written only by service-role (webhook / server actions).
-- Authenticated users may SELECT their own row; they cannot INSERT/UPDATE.

ALTER TABLE public.non_talent_profiles
  ADD COLUMN IF NOT EXISTS market_places JSONB;

CREATE TABLE IF NOT EXISTS public.industry_identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'requires_input'
    CHECK (status IN ('requires_input', 'processing', 'verified', 'canceled', 'expired', 'redacted')),
  last_error_code TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS industry_identity_verifications_user_idx
  ON public.industry_identity_verifications(user_id);

CREATE INDEX IF NOT EXISTS industry_identity_verifications_status_idx
  ON public.industry_identity_verifications(status);

ALTER TABLE public.industry_identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS industry_identity_select_own ON public.industry_identity_verifications;
CREATE POLICY industry_identity_select_own ON public.industry_identity_verifications
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.industry_identity_verifications IS
  'Stripe Identity session status for industry onboarding. Writes via service role only.';
