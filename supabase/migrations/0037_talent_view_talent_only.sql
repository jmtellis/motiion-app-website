-- The live `talent` view (iOS schema) only filtered on is_private, so industry
-- (lookingForTalent) accounts leaked into talent search and the talent navigator.
-- Recreate it with the same columns, restricted to onboarded talent accounts.

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
  AND p.account_type = 'talent'
  AND p.onboarding_completed_at IS NOT NULL;
