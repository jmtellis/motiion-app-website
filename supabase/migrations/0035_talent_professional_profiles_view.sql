-- Talent-only search surface over professional_profiles.
-- Restricts Navigator/Discover verified-first results to completed dancer/choreographer talent.
-- Note: production professional_profiles may not include agency_name; expose a null-compatible column.

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
WHERE p.account_type = 'talent'
  AND p.onboarding_completed_at IS NOT NULL
  AND lower(pp.subtype) IN ('dancer', 'choreographer');

GRANT SELECT ON public.talent_professional_profiles TO anon, authenticated;

COMMENT ON VIEW public.talent_professional_profiles IS
  'Verified-first talent search source: dancers/choreographers with completed talent onboarding only.';
