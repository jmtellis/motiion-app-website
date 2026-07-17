-- Casting candidate pipeline: normalized workflow on top of existing castings/submissions/invitations

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extend castings with richer lifecycle (preserve existing open/draft values)
ALTER TABLE public.castings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS allow_external_candidates BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_multiple_role_submissions BOOLEAN NOT NULL DEFAULT TRUE;

-- Extend invitations with richer lifecycle
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS role_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

UPDATE public.invitations
SET sent_at = created_at
WHERE sent_at IS NULL AND status != 'draft';

-- Extend casting_roles with ordering and status
ALTER TABLE public.casting_roles
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- External candidates (walk-ins, email, agency roster, etc.)
CREATE TABLE IF NOT EXISTS public.casting_external_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_id UUID NOT NULL REFERENCES public.castings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(80),
  representation VARCHAR(255),
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  role_ids UUID[] NOT NULL DEFAULT '{}',
  headshot_url TEXT,
  resume_url TEXT,
  media_url TEXT,
  internal_notes TEXT,
  linked_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalized candidate pipeline row
CREATE TABLE IF NOT EXISTS public.casting_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_id UUID NOT NULL REFERENCES public.castings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  talent_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  external_candidate_id UUID REFERENCES public.casting_external_candidates(id) ON DELETE SET NULL,
  submission_id UUID,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  role_ids UUID[] NOT NULL DEFAULT '{}',
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  status VARCHAR(40) NOT NULL DEFAULT 'discovered',
  display_name VARCHAR(255) NOT NULL DEFAULT 'Candidate',
  email VARCHAR(255),
  agency VARCHAR(255),
  headshot_url TEXT,
  availability_status VARCHAR(40),
  overall_recommendation VARCHAR(10),
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS casting_candidates_casting_idx
  ON public.casting_candidates (casting_id, status);

CREATE INDEX IF NOT EXISTS casting_candidates_project_idx
  ON public.casting_candidates (project_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS casting_candidates_submission_unique
  ON public.casting_candidates (submission_id)
  WHERE submission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS casting_candidates_invitation_unique
  ON public.casting_candidates (invitation_id)
  WHERE invitation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS casting_candidates_talent_unique
  ON public.casting_candidates (casting_id, talent_profile_id)
  WHERE talent_profile_id IS NOT NULL;

-- Evaluations / scorecards
CREATE TABLE IF NOT EXISTS public.casting_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_candidate_id UUID NOT NULL REFERENCES public.casting_candidates(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID,
  recommendation VARCHAR(10),
  scorecard JSONB NOT NULL DEFAULT '{}',
  private_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (casting_candidate_id, evaluator_id, role_id)
);

ALTER TABLE public.casting_external_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS casting_external_candidates_rw ON public.casting_external_candidates;
CREATE POLICY casting_external_candidates_rw ON public.casting_external_candidates
  FOR ALL USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

DROP POLICY IF EXISTS casting_candidates_rw ON public.casting_candidates;
CREATE POLICY casting_candidates_rw ON public.casting_candidates
  FOR ALL USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

DROP POLICY IF EXISTS casting_evaluations_rw ON public.casting_evaluations;
CREATE POLICY casting_evaluations_rw ON public.casting_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.casting_candidates cc
      WHERE cc.id = casting_candidate_id
        AND cc.project_id IN (SELECT public.user_project_ids(auth.uid()))
    )
  );

-- Backfill candidates from invitations
INSERT INTO public.casting_candidates (
  casting_id,
  project_id,
  talent_profile_id,
  invitation_id,
  role_ids,
  source,
  status,
  display_name,
  created_at,
  updated_at
)
SELECT
  i.casting_id,
  i.project_id,
  i.invited_profile_id,
  i.id,
  CASE
    WHEN i.role_id IS NOT NULL THEN ARRAY[i.role_id]
    WHEN i.role_ids IS NOT NULL AND array_length(i.role_ids, 1) > 0 THEN i.role_ids
    ELSE '{}'::uuid[]
  END,
  'invitation',
  CASE i.status
    WHEN 'accepted' THEN 'submitted'
    WHEN 'declined' THEN 'declined'
    ELSE 'invited'
  END,
  COALESCE(pp.slug, 'Talent'),
  i.created_at,
  COALESCE(i.responded_at, i.created_at)
FROM public.invitations i
LEFT JOIN public.professional_profiles pp ON pp.id = i.invited_profile_id
WHERE i.casting_id IS NOT NULL
  AND i.kind = 'casting'
  AND NOT EXISTS (
    SELECT 1 FROM public.casting_candidates cc WHERE cc.invitation_id = i.id
  );

-- Backfill candidates from submissions (via bridged roles)
INSERT INTO public.casting_candidates (
  casting_id,
  project_id,
  talent_profile_id,
  submission_id,
  role_ids,
  source,
  status,
  display_name,
  email,
  agency,
  headshot_url,
  created_at,
  updated_at
)
SELECT
  r.casting_id,
  r.project_id,
  (
    SELECT pp.id FROM public.professional_profiles pp
    WHERE pp.user_id = s.talent_id
    LIMIT 1
  ),
  s.id,
  ARRAY[r.id],
  'public_submission',
  CASE COALESCE(s.status, 'pending')
    WHEN 'approved' THEN 'shortlisted'
    WHEN 'rejected' THEN 'not_moving_forward'
    WHEN 'callback' THEN 'callback'
    WHEN 'pending' THEN 'in_review'
    ELSE 'submitted'
  END,
  COALESCE(s.full_name, 'Applicant'),
  s.email,
  s.agency,
  s.headshot_url,
  COALESCE(s.submitted_at, NOW()),
  COALESCE(s.reviewed_at, s.submitted_at, NOW())
FROM public.submissions s
JOIN public.roles r ON r.id = s.role_id
WHERE r.casting_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.casting_candidates cc WHERE cc.submission_id = s.id
  );
