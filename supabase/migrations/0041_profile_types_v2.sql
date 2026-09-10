-- Mirror of iOS migration 20260809120000_profile_types_v2.sql for website migration pipeline.
-- Normalize talent_types, allow community account_type, harden talent views.

COMMENT ON COLUMN public.profiles.account_type IS
  'Account lane: talent | lookingForTalent | looking_for_talent | community';

COMMENT ON COLUMN public.profiles.talent_types IS
  'JSON array of lowercase talent self-IDs: dancer, choreographer, instructor (multi-select).';

-- talent_types may be jsonb (live) or text[] (baseline). Prefer jsonb path used in production.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'talent_types'
      AND data_type = 'jsonb'
  ) THEN
    UPDATE public.profiles p
    SET talent_types = (
      SELECT coalesce(jsonb_agg(to_jsonb(normalized) ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT
          CASE lower(trim(elem))
            WHEN 'dancer' THEN 'dancer'
            WHEN 'choreographer' THEN 'choreographer'
            WHEN 'instructor' THEN 'instructor'
            ELSE lower(trim(elem))
          END AS normalized,
          min(ordinality) AS ord
        FROM jsonb_array_elements_text(coalesce(p.talent_types, '[]'::jsonb))
          WITH ORDINALITY AS t(elem, ordinality)
        WHERE nullif(trim(elem), '') IS NOT NULL
        GROUP BY 1
      ) s
    )
    WHERE p.account_type = 'talent'
      AND coalesce(p.talent_types, '[]'::jsonb) <> '[]'::jsonb;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.talent AS
SELECT
  p.user_id AS id,
  COALESCE(p.display_name, NULLIF(TRIM(BOTH FROM (COALESCE(p.first_name, '') || ' ') || COALESCE(p.last_name, '')), '')) AS full_name,
  p.headshot_urls ->> 0 AS headshot_url,
  p.headshot_urls,
  CASE
    WHEN COALESCE(p.hide_age, false) THEN NULL::text
    ELSE to_char(p.date_of_birth, 'YYYY-MM-DD')
  END AS date_of_birth,
  p.gender,
  p.ethnicity,
  p.height,
  COALESCE(p.talent_types, '[]'::jsonb) AS talent_types,
  COALESCE(p.skills, '[]'::jsonb) AS skills,
  p.representation,
  p.working_locations ->> 0 AS location,
  NULL::text AS bio,
  p.union_status,
  p.eye_color,
  p.hair_color,
  p.resume_url,
  p.instagram_url,
  p.x_url,
  p.tiktok_url,
  p.whatsapp_url,
  p.youtube_url,
  p.agent AS agency_email,
  COALESCE(p.profile_highlights, '[]'::jsonb) AS profile_highlights,
  p.created_at,
  COALESCE(p.experiences, '[]'::jsonb) AS experiences,
  COALESCE(p.training, '[]'::jsonb) AS training,
  COALESCE(p.styles, '[]'::jsonb) AS styles,
  p.agency_logo_url,
  p.username,
  COALESCE(p.profile_visuals, '[]'::jsonb) AS profile_visuals,
  p.sizing,
  COALESCE(NULLIF(TRIM(BOTH FROM p.contact_email), ''), NULLIF(TRIM(BOTH FROM p.email), '')) AS contact_email,
  NULLIF(TRIM(BOTH FROM p.resume_export_agency_info_line_2), '') AS agent_email,
  COALESCE(p.hide_age, false) AS hide_age
FROM public.profiles p
WHERE COALESCE(p.is_private, false) = false
  AND lower(coalesce(p.account_type, '')) = 'talent'
  AND p.onboarding_completed_at IS NOT NULL;

CREATE OR REPLACE VIEW public.talent_professional_profiles
WITH (security_invoker = true)
AS
SELECT
  pp.id,
  pp.user_id,
  pp.slug,
  pp.subtype,
  pp.styles,
  pp.skills,
  pp.gender,
  pp.ethnicity,
  pp.union_status,
  pp.location_city,
  pp.location_region,
  pp.is_verified,
  NULL::text AS agency_name,
  pp.created_at,
  pp.updated_at
FROM public.professional_profiles pp
INNER JOIN public.profiles p ON p.user_id = pp.user_id
WHERE lower(coalesce(p.account_type, '')) = 'talent'
  AND p.onboarding_completed_at IS NOT NULL
  AND lower(pp.subtype) IN ('dancer', 'choreographer', 'instructor');

GRANT SELECT ON public.talent_professional_profiles TO anon, authenticated;

COMMENT ON VIEW public.talent_professional_profiles IS
  'Verified-first talent search source: dancers/choreographers/instructors with completed talent onboarding only.';

CREATE OR REPLACE FUNCTION public.profiles_community_force_private()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(coalesce(NEW.account_type, '')) = 'community' THEN
    NEW.is_private := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_community_force_private ON public.profiles;
CREATE TRIGGER profiles_community_force_private
  BEFORE INSERT OR UPDATE OF account_type, is_private
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_community_force_private();
