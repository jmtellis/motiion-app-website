-- Seed an empty shell list from account_type so new profiles can be inserted
-- without setting enabled_shells and active_shell explicitly.

CREATE OR REPLACE FUNCTION public.profiles_shells_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized text[];
BEGIN
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

  IF coalesce(cardinality(NEW.enabled_shells), 0) = 0 THEN
    NEW.enabled_shells := ARRAY[
      CASE lower(coalesce(NEW.account_type, 'talent'))
        WHEN 'looking_for_talent' THEN 'lookingForTalent'
        WHEN 'lookingfortalent' THEN 'lookingForTalent'
        WHEN 'community' THEN 'community'
        ELSE 'talent'
      END
    ];
  END IF;

  IF NEW.active_shell IS NULL OR NEW.active_shell = '' THEN
    NEW.active_shell := coalesce(NEW.enabled_shells[1], 'talent');
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

  IF 'community' = ANY (NEW.enabled_shells) AND cardinality(NEW.enabled_shells) > 1 THEN
    RAISE EXCEPTION 'community shell cannot be combined with other shells';
  END IF;

  RETURN NEW;
END;
$$;
