-- Security-definer helpers so Motiion talent users can load open castings
-- and submit referrals without being project members.

CREATE OR REPLACE FUNCTION public.get_casting_referral_context(p_casting_id uuid)
RETURNS TABLE (
  casting_id uuid,
  project_id uuid,
  title text,
  status text,
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

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cr.id,
        'name', coalesce(nullif(trim(cr.title), ''), 'Role'),
        'bridged_role_id', br.id
      )
      ORDER BY cr.sort_order ASC NULLS LAST, cr.title ASC
    ),
    '[]'::jsonb
  )
  INTO v_roles
  FROM public.casting_roles cr
  LEFT JOIN public.roles br
    ON br.casting_id = cr.casting_id
   AND lower(trim(coalesce(br.title, ''))) = lower(trim(coalesce(cr.title, '')))
  WHERE cr.casting_id = v_casting.id;

  casting_id := v_casting.id;
  project_id := v_casting.project_id;
  title := coalesce(nullif(trim(v_casting.title), ''), 'Untitled casting');
  status := v_casting.status;
  roles := v_roles;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_casting_referral_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_casting_referral_context(uuid) TO authenticated;

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

  v_display_name := coalesce(
    nullif(replace(coalesce(v_slug, ''), '-', ' '), ''),
    'Talent'
  );

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
    v_uid,
    now()
  )
  ON CONFLICT DO NOTHING;

  -- Prefer updating an existing candidate row for the same talent when the
  -- partial unique index is present.
  UPDATE public.casting_candidates
  SET
    role_ids = CASE
      WHEN coalesce(array_length(role_ids, 1), 0) = 0 THEN coalesce(p_role_ids, '{}'::uuid[])
      ELSE role_ids
    END,
    source = CASE WHEN source = 'referral' THEN source ELSE 'referral' END,
    updated_at = now()
  WHERE casting_id = v_casting.id
    AND talent_profile_id = v_profile_id;

  RETURN v_referral_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This dancer has already been referred to this casting.';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_casting_referral(uuid, uuid, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_casting_referral(uuid, uuid, uuid[], text) TO authenticated;
