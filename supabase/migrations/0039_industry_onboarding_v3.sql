-- Industry professional onboarding v3: structured goals/work types, org relationship, step resume.
ALTER TABLE public.non_talent_profiles
  ADD COLUMN IF NOT EXISTS custom_role TEXT,
  ADD COLUMN IF NOT EXISTS platform_goals TEXT[],
  ADD COLUMN IF NOT EXISTS work_types TEXT[],
  ADD COLUMN IF NOT EXISTS custom_work_type TEXT,
  ADD COLUMN IF NOT EXISTS organization_relationship TEXT,
  ADD COLUMN IF NOT EXISTS organization_brand_domain TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT;

COMMENT ON COLUMN public.non_talent_profiles.platform_goals IS
  'Structured industry onboarding goals (e.g. find_dancers, run_a_casting).';
COMMENT ON COLUMN public.non_talent_profiles.work_types IS
  'Optional work-type selections from industry onboarding.';
COMMENT ON COLUMN public.non_talent_profiles.organization_relationship IS
  'organization | independent | multiple';
