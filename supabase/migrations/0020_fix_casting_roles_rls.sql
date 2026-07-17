-- Fix casting_roles RLS: migration 0012 enabled RLS but never created policies for casting_roles.
-- Also re-sync user_project_ids to include project_members (poster_id + collaborators).

CREATE OR REPLACE FUNCTION public.user_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.projects WHERE poster_id = uid
  UNION
  SELECT project_id FROM public.project_members WHERE user_id = uid;
$$;

-- Helper avoids castings SELECT RLS blocking policy subqueries on casting_roles.
CREATE OR REPLACE FUNCTION public.user_can_manage_casting(p_casting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.castings c
    WHERE c.id = p_casting_id
      AND c.project_id IN (SELECT public.user_project_ids(auth.uid()))
  );
$$;

ALTER TABLE public.casting_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS casting_roles_select ON public.casting_roles;
DROP POLICY IF EXISTS casting_roles_write_member ON public.casting_roles;
DROP POLICY IF EXISTS casting_roles_insert ON public.casting_roles;
DROP POLICY IF EXISTS casting_roles_update ON public.casting_roles;
DROP POLICY IF EXISTS casting_roles_delete ON public.casting_roles;
DROP POLICY IF EXISTS casting_roles_mutate ON public.casting_roles;

CREATE POLICY casting_roles_select ON public.casting_roles
  FOR SELECT
  USING (
    public.user_can_manage_casting(casting_id)
    OR EXISTS (
      SELECT 1
      FROM public.castings c
      WHERE c.id = casting_id
        AND c.visibility IN ('public', 'unlisted')
    )
  );

CREATE POLICY casting_roles_mutate ON public.casting_roles
  FOR ALL
  USING (public.user_can_manage_casting(casting_id))
  WITH CHECK (public.user_can_manage_casting(casting_id));

-- Align castings write policies (idempotent)
DROP POLICY IF EXISTS castings_write ON public.castings;
DROP POLICY IF EXISTS castings_write_member ON public.castings;

CREATE POLICY castings_write ON public.castings
  FOR ALL
  USING (project_id IN (SELECT public.user_project_ids(auth.uid())))
  WITH CHECK (project_id IN (SELECT public.user_project_ids(auth.uid())));

-- Advisor: enable RLS on stripe_webhook_events (service-role writes only)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_webhook_events_service ON public.stripe_webhook_events;
CREATE POLICY stripe_webhook_events_service ON public.stripe_webhook_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
