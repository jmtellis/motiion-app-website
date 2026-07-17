-- Referrals into a casting from Motiion users (e.g. "refer a dancer" flow)

CREATE TABLE IF NOT EXISTS public.casting_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_id UUID NOT NULL REFERENCES public.castings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_ids UUID[] NOT NULL DEFAULT '{}',
  referred_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (casting_id, referred_profile_id)
);

CREATE INDEX IF NOT EXISTS casting_referrals_casting_idx
  ON public.casting_referrals (casting_id, created_at DESC);

CREATE INDEX IF NOT EXISTS casting_referrals_referrer_idx
  ON public.casting_referrals (referrer_user_id, created_at DESC);

ALTER TABLE public.casting_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS casting_referrals_select ON public.casting_referrals;
CREATE POLICY casting_referrals_select ON public.casting_referrals
  FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT public.user_project_ids(auth.uid()))
    OR referrer_user_id = auth.uid()
  );

DROP POLICY IF EXISTS casting_referrals_insert ON public.casting_referrals;
CREATE POLICY casting_referrals_insert ON public.casting_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    referrer_user_id = auth.uid()
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
