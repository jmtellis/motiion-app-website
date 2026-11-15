-- An organizer-granted featured talent team project is not an Industry professional feature.
-- Its owner and admins manage it without Industry approval; the exemption never extends to
-- any other project, and the featured workspace guards keep it private and invitation-only.
CREATE OR REPLACE FUNCTION public.is_featured_workspace_project(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_project_id IS NOT NULL
    AND EXISTS(SELECT 1 FROM public.featured_talent_workspaces w WHERE w.project_id = p_project_id);
$$;
REVOKE ALL ON FUNCTION public.is_featured_workspace_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_featured_workspace_project(uuid) TO authenticated, service_role;

-- The workspace context row can only reference the project after it exists, so the open RPC
-- marks its own insert with a transaction-local setting that clients cannot reach.
CREATE OR REPLACE FUNCTION public.guard_industry_project_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb;
BEGIN
  row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_OP='INSERT' AND auth.uid() IS NOT NULL
     AND coalesce(current_setting('motiion.featured_workspace_owner', true), '') = auth.uid()::text
     AND NEW.poster_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  IF TG_OP<>'INSERT' AND public.is_featured_workspace_project(OLD.id) THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_industry_approval(auth.uid()) AND NOT public.auth_is_platform_admin()
     AND (coalesce(row_data->>'project_type','') IN ('casting','job') OR coalesce((row_data->>'is_composable')::boolean,false)
       OR (TG_OP='UPDATE' AND (to_jsonb(OLD)->>'project_type' IN ('casting','job') OR coalesce((to_jsonb(OLD)->>'is_composable')::boolean,false)))) THEN
    RAISE EXCEPTION 'Your industry application must be approved before creating or managing projects.' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_industry_project_write() FROM PUBLIC,anon,authenticated;

-- Roles, castings and casting roles inside the team project power its optional Casting tool.
CREATE OR REPLACE FUNCTION public.guard_industry_approval_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_new uuid; v_old uuid;
BEGIN
  IF auth.uid() IS NULL OR public.has_industry_approval(auth.uid()) OR public.auth_is_platform_admin() THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP<>'DELETE' THEN
    v_new := coalesce(nullif(to_jsonb(NEW)->>'project_id','')::uuid,
      (SELECT c.project_id FROM public.castings c WHERE c.id = nullif(to_jsonb(NEW)->>'casting_id','')::uuid));
  END IF;
  IF TG_OP<>'INSERT' THEN
    v_old := coalesce(nullif(to_jsonb(OLD)->>'project_id','')::uuid,
      (SELECT c.project_id FROM public.castings c WHERE c.id = nullif(to_jsonb(OLD)->>'casting_id','')::uuid));
  END IF;
  IF (TG_OP='DELETE' OR public.is_featured_workspace_project(v_new))
     AND (TG_OP='INSERT' OR public.is_featured_workspace_project(v_old)) THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Your industry application must be approved before using professional features.' USING ERRCODE='42501';
END;
$$;
REVOKE ALL ON FUNCTION public.guard_industry_approval_write() FROM PUBLIC,anon,authenticated;

-- Group chats, confirmations and casting management share this operator predicate.
CREATE OR REPLACE FUNCTION public.is_project_operator(p_project_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user_id IS NOT NULL AND (
    public.has_industry_approval(p_user_id) OR public.is_featured_workspace_project(p_project_id) OR EXISTS(
      SELECT 1 FROM public.projects p WHERE p.id=p_project_id
      AND coalesce(to_jsonb(p)->>'project_type','') NOT IN ('casting','job')
      AND NOT coalesce((to_jsonb(p)->>'is_composable')::boolean,false)
    )
  ) AND (
    EXISTS(SELECT 1 FROM public.projects p WHERE p.id=p_project_id AND p.poster_id=p_user_id)
    OR EXISTS(SELECT 1 FROM public.project_members pm WHERE pm.project_id=p_project_id AND pm.user_id=p_user_id AND pm.role='admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_project_operator(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_project_operator(uuid,uuid) TO authenticated,service_role;

DO $$ BEGIN
  IF to_regclass('public.casting_candidates') IS NOT NULL THEN
    DROP POLICY IF EXISTS industry_candidate_insert ON public.casting_candidates;
    DROP POLICY IF EXISTS industry_candidate_update ON public.casting_candidates;
    DROP POLICY IF EXISTS industry_candidate_delete ON public.casting_candidates;
    CREATE POLICY industry_candidate_insert ON public.casting_candidates AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK(((SELECT public.has_industry_approval()) OR public.is_featured_workspace_project(project_id))
        AND public.is_project_operator(project_id, (SELECT auth.uid())));
    CREATE POLICY industry_candidate_update ON public.casting_candidates AS RESTRICTIVE FOR UPDATE TO authenticated
      USING(((SELECT public.has_industry_approval()) OR public.is_featured_workspace_project(project_id))
        AND public.is_project_operator(project_id, (SELECT auth.uid())))
      WITH CHECK(((SELECT public.has_industry_approval()) OR public.is_featured_workspace_project(project_id))
        AND public.is_project_operator(project_id, (SELECT auth.uid())));
    CREATE POLICY industry_candidate_delete ON public.casting_candidates AS RESTRICTIVE FOR DELETE TO authenticated
      USING(((SELECT public.has_industry_approval()) OR public.is_featured_workspace_project(project_id))
        AND public.is_project_operator(project_id, (SELECT auth.uid())));
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.open_featured_talent_workspace(p_featured_talent_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.activity_featured_talent; v_event public.activities; v_project uuid; v_title text;
BEGIN
  -- Row lock makes repeated taps and concurrent opens return one project.
  SELECT * INTO v_row FROM public.activity_featured_talent WHERE id = p_featured_talent_id FOR UPDATE;
  IF auth.uid() IS NULL OR v_row.talent_user_id IS DISTINCT FROM auth.uid()
     OR v_row.parent_id IS NOT NULL OR v_row.status <> 'accepted' OR NOT v_row.workspace_enabled THEN
    RAISE EXCEPTION 'Accept your featured talent invitation before opening this team project.' USING ERRCODE = '42501';
  END IF;
  SELECT project_id INTO v_project FROM public.featured_talent_workspaces WHERE featured_talent_id = v_row.id AND owner_id = auth.uid();
  IF v_project IS NOT NULL THEN
    UPDATE public.featured_talent_workspaces SET ended_at = NULL WHERE project_id = v_project;
    RETURN v_project;
  END IF;
  SELECT * INTO STRICT v_event FROM public.activities WHERE id = v_row.activity_id;
  v_title := left(v_event.title, 170) || ' · My team';
  PERFORM set_config('motiion.featured_workspace_owner', auth.uid()::text, true);
  INSERT INTO public.projects(poster_id, title, location, start_date, visibility, casting_link_access,
    is_active, is_composable, casting_configuration, project_configuration)
  VALUES(auth.uid(), v_title, v_event.location, v_event.activity_date, 'private', 'invited', true, true,
    jsonb_build_object('schema_version',7,'composer_draft',true),
    jsonb_build_object('attachments','[]'::jsonb,'composer_draft',false)) RETURNING id INTO v_project;
  PERFORM set_config('motiion.featured_workspace_owner', '', true);
  INSERT INTO public.featured_talent_workspaces(project_id,featured_talent_id,event_id,owner_id,event_title)
    VALUES(v_project,v_row.id,v_row.activity_id,auth.uid(),v_event.title);
  RETURN v_project;
END;
$$;
REVOKE ALL ON FUNCTION public.open_featured_talent_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_featured_talent_workspace(uuid) TO authenticated;
