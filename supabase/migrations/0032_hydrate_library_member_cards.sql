-- Library cards need name/location/avatar for roster members even when those
-- professional_profiles rows are unverified (buyer RLS would otherwise hide them).

CREATE OR REPLACE FUNCTION public.hydrate_library_member_cards(p_profile_ids uuid[])
RETURNS TABLE (
  profile_id uuid,
  slug text,
  name text,
  location text,
  avatar_url text,
  styles text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    pp.id AS profile_id,
    pp.slug,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
      NULLIF(TRIM(p.username), ''),
      NULLIF(TRIM(pp.slug), ''),
      'Talent'
    ) AS name,
    COALESCE(
      NULLIF(
        TRIM(
          CONCAT_WS(
            ', ',
            NULLIF(TRIM(pp.location_city), ''),
            NULLIF(TRIM(pp.location_region), '')
          )
        ),
        ''
      ),
      NULLIF(TRIM(p.working_locations ->> 0), '')
    ) AS location,
    COALESCE(
      (
        SELECT NULLIF(TRIM(url), '')
        FROM jsonb_array_elements_text(COALESCE(p.headshot_urls, '[]'::jsonb)) AS url
        WHERE NULLIF(TRIM(url), '') IS NOT NULL
        LIMIT 1
      ),
      (
        SELECT COALESCE(NULLIF(TRIM(ma.url), ''), NULLIF(TRIM(ma.storage_path), ''))
        FROM media_assets ma
        WHERE ma.profile_id = pp.id
          AND ma.kind = 'headshot'
        ORDER BY ma.position ASC NULLS LAST, ma.created_at ASC NULLS LAST
        LIMIT 1
      )
    ) AS avatar_url,
    COALESCE(
      (
        SELECT array_agg(style_value)
        FROM (
          SELECT NULLIF(TRIM(value), '') AS style_value
          FROM unnest(COALESCE(pp.styles, '{}'::text[])) AS value
          WHERE NULLIF(TRIM(value), '') IS NOT NULL
          LIMIT 3
        ) limited_styles
      ),
      '{}'::text[]
    ) AS styles
  FROM professional_profiles pp
  LEFT JOIN profiles p ON p.user_id = pp.user_id
  WHERE pp.id = ANY (p_profile_ids);
$$;

REVOKE ALL ON FUNCTION public.hydrate_library_member_cards(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hydrate_library_member_cards(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hydrate_library_member_cards(uuid[]) TO service_role;
