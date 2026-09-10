-- Mirror: allow industry onboarding v3 roles on non_talent_profiles.role.

ALTER TABLE public.non_talent_profiles
  DROP CONSTRAINT IF EXISTS non_talent_profiles_role_check;

ALTER TABLE public.non_talent_profiles
  ADD CONSTRAINT non_talent_profiles_role_check
  CHECK (
    role IS NULL
    OR role IN (
      'choreographer',
      'casting_professional',
      'creative_director_or_producer',
      'talent_representative',
      'brand_or_agency_professional',
      'other',
      'casting_director',
      'creative_director',
      'producer',
      'talent_agency',
      'studio_owner',
      'dance_company',
      'brand',
      'production_company',
      'event_organizer'
    )
  );
