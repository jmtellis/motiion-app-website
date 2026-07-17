-- casting_roles has sort_order, not created_at.
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
