-- Dual-lane shells: enabled_shells + active_shell on profiles.
-- Keep account_type as original signup / public talent identity.
-- Community cannot gain other shells.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enabled_shells text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS active_shell text;

COMMENT ON COLUMN public.profiles.enabled_shells IS
  'Shells this user may open: talent | lookingForTalent | community. Community is exclusive.';

COMMENT ON COLUMN public.profiles.active_shell IS
  'Currently selected app shell; must be a member of enabled_shells.';

-- Backfill from account_type (normalize looking_for_talent → lookingForTalent).
UPDATE public.profiles
SET
  enabled_shells = ARRAY[
    CASE lower(coalesce(account_type, 'talent'))
      WHEN 'looking_for_talent' THEN 'lookingForTalent'
      WHEN 'lookingfortalent' THEN 'lookingForTalent'
      WHEN 'community' THEN 'community'
      ELSE 'talent'
    END
  ],
  active_shell = CASE lower(coalesce(account_type, 'talent'))
    WHEN 'looking_for_talent' THEN 'lookingForTalent'
    WHEN 'lookingfortalent' THEN 'lookingForTalent'
    WHEN 'community' THEN 'community'
    ELSE 'talent'
  END
WHERE coalesce(cardinality(enabled_shells), 0) = 0
   OR active_shell IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN active_shell SET NOT NULL;

-- Keep active_shell inside enabled_shells; block community dual-lane.
CREATE OR REPLACE FUNCTION public.profiles_shells_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_shell text;
  v_normalized text[];
BEGIN
  -- Normalize looking_for_talent variants in enabled_shells.
  SELECT coalesce(array_agg(DISTINCT CASE lower(s)
    WHEN 'looking_for_talent' THEN 'lookingForTalent'
    WHEN 'lookingfortalent' THEN 'lookingForTalent'
    WHEN 'community' THEN 'community'
    WHEN 'talent' THEN 'talent'
    ELSE s
  END), '{}'::text[])
  INTO v_normalized
  FROM unnest(coalesce(NEW.enabled_shells, '{}'::text[])) AS s
  WHERE nullif(trim(s), '') IS NOT NULL;

  NEW.enabled_shells := v_normalized;

  IF NEW.active_shell IS NULL OR NEW.active_shell = '' THEN
    NEW.active_shell := coalesce(v_normalized[1], 'talent');
  END IF;

  NEW.active_shell := CASE lower(NEW.active_shell)
    WHEN 'looking_for_talent' THEN 'lookingForTalent'
    WHEN 'lookingfortalent' THEN 'lookingForTalent'
    WHEN 'community' THEN 'community'
    ELSE NEW.active_shell
  END;

  IF NOT (NEW.active_shell = ANY (NEW.enabled_shells)) THEN
    RAISE EXCEPTION 'active_shell % is not in enabled_shells %', NEW.active_shell, NEW.enabled_shells;
  END IF;

  -- Community is exclusive: cannot combine with talent / industry.
  IF 'community' = ANY (NEW.enabled_shells) AND cardinality(NEW.enabled_shells) > 1 THEN
    RAISE EXCEPTION 'community shell cannot be combined with other shells';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_shells_guard ON public.profiles;
CREATE TRIGGER profiles_shells_guard
  BEFORE INSERT OR UPDATE OF enabled_shells, active_shell
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_shells_guard();

-- Switch active shell without rewriting the rest of the profile.
CREATE OR REPLACE FUNCTION public.set_active_shell(p_shell text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shell text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_shell := CASE lower(trim(coalesce(p_shell, '')))
    WHEN 'looking_for_talent' THEN 'lookingForTalent'
    WHEN 'lookingfortalent' THEN 'lookingForTalent'
    WHEN 'community' THEN 'community'
    WHEN 'talent' THEN 'talent'
    ELSE NULL
  END;

  IF v_shell IS NULL THEN
    RAISE EXCEPTION 'invalid shell %', p_shell;
  END IF;

  UPDATE public.profiles
  SET active_shell = v_shell, updated_at = timezone('utc', now())
  WHERE user_id = v_uid
    AND v_shell = ANY (enabled_shells);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shell % is not enabled for this user', v_shell;
  END IF;

  RETURN v_shell;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_shell(text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_active_shell(text) TO authenticated;

-- Enable an additional shell (talent or lookingForTalent only). Community blocked.
CREATE OR REPLACE FUNCTION public.enable_profile_shell(p_shell text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shell text;
  v_enabled text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_shell := CASE lower(trim(coalesce(p_shell, '')))
    WHEN 'looking_for_talent' THEN 'lookingForTalent'
    WHEN 'lookingfortalent' THEN 'lookingForTalent'
    WHEN 'talent' THEN 'talent'
    ELSE NULL
  END;

  IF v_shell IS NULL THEN
    RAISE EXCEPTION 'invalid shell to enable %', p_shell;
  END IF;

  SELECT enabled_shells INTO v_enabled
  FROM public.profiles
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF 'community' = ANY (v_enabled) THEN
    RAISE EXCEPTION 'community accounts cannot add other shells';
  END IF;

  IF NOT (v_shell = ANY (v_enabled)) THEN
    v_enabled := array_append(v_enabled, v_shell);
  END IF;

  UPDATE public.profiles
  SET
    enabled_shells = v_enabled,
    active_shell = v_shell,
    -- Talent directory requires account_type = talent when talent shell is enabled.
    account_type = CASE
      WHEN v_shell = 'talent' THEN 'talent'
      ELSE account_type
    END,
    updated_at = timezone('utc', now())
  WHERE user_id = v_uid;

  RETURN v_enabled;
END;
$$;

REVOKE ALL ON FUNCTION public.enable_profile_shell(text) FROM public;
GRANT EXECUTE ON FUNCTION public.enable_profile_shell(text) TO authenticated;
