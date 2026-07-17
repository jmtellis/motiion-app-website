-- Fix referral display (name/headshot), role dedupe for referrer context,
-- and expose casting/role attributes for referrers.

DROP FUNCTION IF EXISTS public.get_casting_referral_context(uuid);

CREATE OR REPLACE FUNCTION public.get_casting_referral_context(p_casting_id uuid)
RETURNS TABLE (
  casting_id uuid,
  project_id uuid,
  title text,
  status text,
  description text,
  roles jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_casting public.castings%ROWTYPE;
  v_roles jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  SELECT *
  INTO v_casting
  FROM public.castings
  WHERE id = p_casting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Casting not found.';
  END IF;

  IF coalesce(v_casting.status, '') NOT IN ('open', 'published') THEN
    RAISE EXCEPTION 'This casting is not accepting referrals.';
  END IF;

  -- One row per role title (avoids leftover duplicates + bridged title-join inflation).
  WITH ranked_roles AS (
    SELECT
      cr.*,
      lower(trim(coalesce(cr.title, ''))) AS title_key,
      row_number() OVER (
        PARTITION BY lower(trim(coalesce(cr.title, '')))
        ORDER BY cr.sort_order ASC NULLS LAST, cr.id ASC
      ) AS rn
    FROM public.casting_roles cr
    WHERE cr.casting_id = v_casting.id
      AND coalesce(nullif(trim(cr.title), ''), '') <> ''
  ),
  unique_roles AS (
    SELECT * FROM ranked_roles WHERE rn = 1
  ),
  with_bridge AS (
    SELECT
      ur.id,
      ur.title,
      ur.description,
      ur.gender,
      ur.age_min,
      ur.age_max,
      ur.ethnicity_preferences,
      ur.special_skills,
      ur.height_min_cm,
      ur.height_max_cm,
      ur.union_status,
      ur.people_needed,
      ur.sort_order,
      (
        SELECT br.id
        FROM public.roles br
        WHERE br.casting_id = ur.casting_id
          AND lower(trim(coalesce(br.title, ''))) = ur.title_key
        ORDER BY br.created_at ASC NULLS LAST, br.id ASC
        LIMIT 1
      ) AS bridged_role_id
    FROM unique_roles ur
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', wb.id,
        'name', coalesce(nullif(trim(wb.title), ''), 'Role'),
        'bridged_role_id', wb.bridged_role_id,
        'description', nullif(trim(coalesce(wb.description, '')), ''),
        'gender', nullif(trim(coalesce(wb.gender, '')), ''),
        'age_min', wb.age_min,
        'age_max', wb.age_max,
        'ethnicity_preferences', coalesce(to_jsonb(wb.ethnicity_preferences), '[]'::jsonb),
        'special_skills', coalesce(to_jsonb(wb.special_skills), '[]'::jsonb),
        'height_min_cm', wb.height_min_cm,
        'height_max_cm', wb.height_max_cm,
        'union_status', nullif(trim(coalesce(wb.union_status, '')), ''),
        'people_needed', coalesce(wb.people_needed, 1)
      )
      ORDER BY wb.sort_order ASC NULLS LAST, wb.title ASC
    ),
    '[]'::jsonb
  )
  INTO v_roles
  FROM with_bridge wb;

  casting_id := v_casting.id;
  project_id := v_casting.project_id;
  title := coalesce(nullif(trim(v_casting.title), ''), 'Untitled casting');
  status := v_casting.status;
  description := nullif(trim(coalesce(v_casting.description, '')), '');
  roles := v_roles;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_casting_referral(
  p_casting_id uuid,
  p_referred_talent_user_id uuid,
  p_role_ids uuid[] DEFAULT '{}',
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_casting public.castings%ROWTYPE;
  v_profile_id uuid;
  v_slug text;
  v_referral_id uuid;
  v_display_name text;
  v_headshot_url text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  IF p_referred_talent_user_id IS NULL THEN
    RAISE EXCEPTION 'Select a dancer to refer.';
  END IF;

  IF p_referred_talent_user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot refer yourself.';
  END IF;

  SELECT *
  INTO v_casting
  FROM public.castings
  WHERE id = p_casting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Casting not found.';
  END IF;

  IF coalesce(v_casting.status, '') NOT IN ('open', 'published') THEN
    RAISE EXCEPTION 'This casting is not accepting referrals.';
  END IF;

  SELECT pp.id, pp.slug
  INTO v_profile_id, v_slug
  FROM public.professional_profiles pp
  WHERE pp.user_id = p_referred_talent_user_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'This profile isn''t available for referrals yet.';
  END IF;

  SELECT
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(concat_ws(' ', nullif(trim(p.first_name), ''), nullif(trim(p.last_name), ''))), ''),
      nullif(replace(coalesce(v_slug, ''), '-', ' '), ''),
      'Talent'
    ),
    coalesce(
      nullif(trim(p.headshot_urls #>> '{0}'), ''),
      (
        SELECT nullif(trim(ma.url), '')
        FROM public.media_assets ma
        WHERE ma.profile_id = v_profile_id
          AND lower(coalesce(ma.kind, '')) = 'headshot'
        ORDER BY ma.position ASC NULLS LAST, ma.created_at ASC NULLS LAST
        LIMIT 1
      )
    )
  INTO v_display_name, v_headshot_url
  FROM public.profiles p
  WHERE p.user_id = p_referred_talent_user_id
  LIMIT 1;

  IF v_display_name IS NULL THEN
    v_display_name := coalesce(
      nullif(replace(coalesce(v_slug, ''), '-', ' '), ''),
      'Talent'
    );
  END IF;

  INSERT INTO public.casting_referrals (
    casting_id,
    project_id,
    referred_profile_id,
    referrer_user_id,
    role_ids,
    note,
    status,
    source
  )
  VALUES (
    v_casting.id,
    v_casting.project_id,
    v_profile_id,
    v_uid,
    coalesce(p_role_ids, '{}'::uuid[]),
    nullif(trim(coalesce(p_note, '')), ''),
    'submitted',
    'authenticated'
  )
  RETURNING id INTO v_referral_id;

  INSERT INTO public.casting_candidates (
    casting_id,
    project_id,
    talent_profile_id,
    role_ids,
    source,
    status,
    display_name,
    headshot_url,
    created_by,
    updated_at
  )
  VALUES (
    v_casting.id,
    v_casting.project_id,
    v_profile_id,
    coalesce(p_role_ids, '{}'::uuid[]),
    'referral',
    'discovered',
    v_display_name,
    v_headshot_url,
    v_uid,
    now()
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.casting_candidates
  SET
    role_ids = CASE
      WHEN coalesce(array_length(role_ids, 1), 0) = 0 THEN coalesce(p_role_ids, '{}'::uuid[])
      ELSE role_ids
    END,
    source = 'referral',
    display_name = CASE
      WHEN coalesce(nullif(trim(display_name), ''), '') IN ('', 'Talent', 'Applicant', 'Candidate', 'Unnamed applicant')
        OR display_name ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        OR display_name = replace(coalesce(v_slug, ''), '-', ' ')
        OR display_name = coalesce(v_slug, '')
      THEN v_display_name
      ELSE display_name
    END,
    headshot_url = coalesce(v_headshot_url, headshot_url),
    updated_at = now()
  WHERE casting_id = v_casting.id
    AND talent_profile_id = v_profile_id;

  RETURN v_referral_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This dancer has already been referred to this casting.';
END;
$$;

-- Backfill existing referral candidates so buyer UI shows names/photos now.
UPDATE public.casting_candidates cc
SET
  display_name = coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(concat_ws(' ', nullif(trim(p.first_name), ''), nullif(trim(p.last_name), ''))), ''),
    nullif(replace(coalesce(pp.slug, ''), '-', ' '), ''),
    cc.display_name
  ),
  headshot_url = coalesce(
    nullif(trim(p.headshot_urls #>> '{0}'), ''),
    (
      SELECT nullif(trim(ma.url), '')
      FROM public.media_assets ma
      WHERE ma.profile_id = pp.id
        AND lower(coalesce(ma.kind, '')) = 'headshot'
      ORDER BY ma.position ASC NULLS LAST, ma.created_at ASC NULLS LAST
      LIMIT 1
    ),
    cc.headshot_url
  ),
  updated_at = now()
FROM public.professional_profiles pp
LEFT JOIN public.profiles p ON p.user_id = pp.user_id
WHERE cc.talent_profile_id = pp.id
  AND cc.source = 'referral'
  AND (
    cc.headshot_url IS NULL
    OR coalesce(nullif(trim(cc.display_name), ''), '') IN ('', 'Talent', 'Applicant', 'Candidate', 'Unnamed applicant')
    OR cc.display_name = coalesce(pp.slug, '')
    OR cc.display_name = replace(coalesce(pp.slug, ''), '-', ' ')
    OR cc.display_name ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  );
