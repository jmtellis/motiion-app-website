-- Fix duplicate MESSAGE option in choreographer casting quota trigger.
-- RAISE EXCEPTION 'text' already supplies a message; USING message = ... duplicates it.

CREATE OR REPLACE FUNCTION public.enforce_choreographer_casting_publish_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_plan text;
  v_published int;
  v_was_published boolean;
  v_is_published boolean;
BEGIN
  v_was_published := tg_op = 'UPDATE' AND public.project_is_published_casting(old);
  v_is_published := public.project_is_published_casting(new);

  -- Allow edits to already-published projects; only gate new publishes.
  IF NOT v_is_published OR v_was_published THEN
    RETURN new;
  END IF;

  v_plan := public.effective_choreographer_plan_tier(new.poster_id);
  IF v_plan = 'pro' THEN
    RETURN new;
  END IF;

  v_published := public.count_choreographer_published_castings(new.poster_id, new.id);

  IF v_published >= 2 THEN
    RAISE EXCEPTION USING
      errcode = 'P0001',
      message = 'Free plan allows 2 published castings. Upgrade to Choreographer Pro for unlimited castings.';
  END IF;

  RETURN new;
END;
$$;
