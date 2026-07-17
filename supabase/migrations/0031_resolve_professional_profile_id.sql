-- Buyers can browse the public `talent` view (profiles), but RLS on
-- professional_profiles only exposes verified rows. Library memberships
-- reference professional_profiles.id, so saving from search must resolve
-- (and if needed create a stub) via a SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.resolve_professional_profile_id(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := nullif(trim(p_key), '');
  v_uuid uuid;
  v_user_id uuid;
  v_profile_id uuid;
  v_username text;
  v_slug text;
BEGIN
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_uuid := v_key::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_uuid := NULL;
  END;

  IF v_uuid IS NOT NULL THEN
    SELECT id INTO v_profile_id
    FROM professional_profiles
    WHERE id = v_uuid
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      RETURN v_profile_id;
    END IF;

    SELECT id INTO v_profile_id
    FROM professional_profiles
    WHERE user_id = v_uuid
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      RETURN v_profile_id;
    END IF;

    v_user_id := v_uuid;
  END IF;

  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id
    FROM professional_profiles
    WHERE slug = v_key
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      RETURN v_profile_id;
    END IF;

    SELECT id INTO v_profile_id
    FROM professional_profiles
    WHERE lower(slug) = lower(v_key)
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      RETURN v_profile_id;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT user_id, username INTO v_user_id, v_username
    FROM profiles
    WHERE username = v_key
       OR lower(username) = lower(v_key)
    LIMIT 1;
  ELSE
    SELECT username INTO v_username
    FROM profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_profile_id
  FROM professional_profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;

  -- Talent can appear in search/profile views before a professional_profiles
  -- row exists. Create a minimal row so Library memberships can reference it.
  v_slug := nullif(trim(v_username), '');
  IF v_slug IS NULL THEN
    v_slug := 'talent-' || replace(v_user_id::text, '-', '');
  END IF;

  IF EXISTS (SELECT 1 FROM professional_profiles WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(replace(v_user_id::text, '-', ''), 1, 8);
  END IF;

  INSERT INTO professional_profiles (user_id, slug, subtype, is_verified)
  VALUES (v_user_id, v_slug, 'dancer', false)
  ON CONFLICT (user_id) DO UPDATE
    SET updated_at = now()
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_professional_profile_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_professional_profile_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_professional_profile_id(text) TO service_role;
