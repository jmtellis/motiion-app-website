-- Invitation-scoped private projects. Public lineup and private membership are separate.
ALTER TABLE public.activity_featured_talent
  ADD COLUMN IF NOT EXISTS workspace_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.featured_talent_workspaces (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  featured_talent_id uuid UNIQUE REFERENCES public.activity_featured_talent(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_title text NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS featured_talent_workspaces_owner_idx ON public.featured_talent_workspaces(owner_id);
CREATE INDEX IF NOT EXISTS featured_talent_workspaces_event_idx ON public.featured_talent_workspaces(event_id);
ALTER TABLE public.featured_talent_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.featured_talent_workspaces FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.featured_talent_workspaces TO authenticated;
GRANT ALL ON public.featured_talent_workspaces TO service_role;
CREATE POLICY "Workspace team reads its event context" ON public.featured_talent_workspaces
  FOR SELECT TO authenticated USING (project_id IN (SELECT public.user_project_ids((SELECT auth.uid()))));

CREATE OR REPLACE FUNCTION public.guard_featured_workspace_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.workspace_enabled) OR
     (TG_OP = 'UPDATE' AND NEW.workspace_enabled IS DISTINCT FROM OLD.workspace_enabled) THEN
    IF auth.uid() IS NULL OR NOT (public.is_activity_manager(NEW.activity_id) OR public.auth_is_platform_admin()) THEN
      RAISE EXCEPTION 'Only event organizers can enable a private team project.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND EXISTS(SELECT 1 FROM public.featured_talent_workspaces WHERE featured_talent_id = OLD.id)
     AND (NEW.talent_user_id IS DISTINCT FROM OLD.talent_user_id OR NEW.activity_id IS DISTINCT FROM OLD.activity_id
       OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
    RAISE EXCEPTION 'An existing team project cannot be reassigned to another featured entry.' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('removed','declined') AND NEW.status IN ('pending','accepted')
     AND EXISTS(SELECT 1 FROM public.featured_talent_workspaces WHERE featured_talent_id = OLD.id)
     AND (auth.uid() IS NULL OR NOT (public.is_activity_manager(NEW.activity_id) OR public.auth_is_platform_admin())) THEN
    RAISE EXCEPTION 'Ask the event organizer for a new invitation.' USING ERRCODE = '42501';
  END IF;
  IF NEW.workspace_enabled AND (NEW.parent_id IS NOT NULL OR NEW.talent_user_id IS NULL) THEN
    RAISE EXCEPTION 'Private team projects are for featured talent with a Motiion account.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_featured_workspace_grant() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_featured_workspace_grant BEFORE INSERT OR UPDATE ON public.activity_featured_talent
  FOR EACH ROW EXECUTE FUNCTION public.guard_featured_workspace_grant();

CREATE OR REPLACE FUNCTION public.set_featured_talent_workspace(p_featured_talent_id uuid, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.activity_featured_talent;
BEGIN
  SELECT * INTO v_row FROM public.activity_featured_talent WHERE id = p_featured_talent_id FOR UPDATE;
  IF auth.uid() IS NULL OR v_row.id IS NULL OR NOT (public.is_activity_manager(v_row.activity_id) OR public.auth_is_platform_admin()) THEN
    RAISE EXCEPTION 'Only event organizers can enable a private team project.' USING ERRCODE = '42501';
  END IF;
  IF v_row.parent_id IS NOT NULL OR v_row.talent_user_id IS NULL OR v_row.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Choose invited or accepted featured talent with a Motiion account.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.activity_featured_talent SET workspace_enabled = p_enabled WHERE id = v_row.id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_featured_talent_workspace(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_featured_talent_workspace(uuid,boolean) TO authenticated;

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
  INSERT INTO public.projects(poster_id, title, location, start_date, visibility, casting_link_access,
    is_active, is_composable, casting_configuration, project_configuration)
  VALUES(auth.uid(), v_title, v_event.location, v_event.activity_date, 'private', 'invited', true, true,
    jsonb_build_object('schema_version',7,'composer_draft',true),
    jsonb_build_object('attachments','[]'::jsonb,'composer_draft',false)) RETURNING id INTO v_project;
  INSERT INTO public.featured_talent_workspaces(project_id,featured_talent_id,event_id,owner_id,event_title)
    VALUES(v_project,v_row.id,v_row.activity_id,auth.uid(),v_event.title);
  -- Core People, Groups, Schedule and Messages work without optional ability rows.
  RETURN v_project;
END;
$$;
REVOKE ALL ON FUNCTION public.open_featured_talent_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_featured_talent_workspace(uuid) TO authenticated;

-- Removing a feature, disabling its workspace or deleting its event never deletes private work.
CREATE OR REPLACE FUNCTION public.end_featured_talent_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Event/account cascades can run before the context foreign-key actions.
    UPDATE public.featured_talent_workspaces w SET ended_at = coalesce(w.ended_at, now()),
      event_id = CASE WHEN EXISTS(SELECT 1 FROM public.activities a WHERE a.id = w.event_id) THEN w.event_id ELSE NULL END
      WHERE w.featured_talent_id = OLD.id AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id = w.owner_id);
    RETURN OLD;
  END IF;
  IF NEW.status <> 'accepted' OR NOT NEW.workspace_enabled OR NEW.parent_id IS NOT NULL
     OR NEW.talent_user_id IS DISTINCT FROM OLD.talent_user_id THEN
    UPDATE public.featured_talent_workspaces SET ended_at = coalesce(ended_at, now()) WHERE featured_talent_id = NEW.id;
  ELSIF NEW.status = 'accepted' AND NEW.workspace_enabled THEN
    UPDATE public.featured_talent_workspaces SET ended_at = NULL
      WHERE featured_talent_id = NEW.id AND owner_id = NEW.talent_user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.end_featured_talent_workspace() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER end_featured_talent_workspace BEFORE UPDATE OR DELETE ON public.activity_featured_talent
  FOR EACH ROW EXECUTE FUNCTION public.end_featured_talent_workspace();

CREATE OR REPLACE FUNCTION public.leave_featured_talent_workspace(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_context public.featured_talent_workspaces;
BEGIN
  SELECT * INTO v_context FROM public.featured_talent_workspaces WHERE project_id = p_project_id;
  IF auth.uid() IS NULL OR v_context.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the featured talent can leave this event.' USING ERRCODE = '42501';
  END IF;
  -- Lock in the same order as open/enable. Booking and conversation records are preserved.
  PERFORM 1 FROM public.activity_featured_talent WHERE id = v_context.featured_talent_id FOR UPDATE;
  IF v_context.ended_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.activity_featured_talent SET status = 'removed', responded_at = now()
    WHERE (id = v_context.featured_talent_id OR parent_id = v_context.featured_talent_id)
      AND status <> 'removed';
  UPDATE public.activity_featured_talent_invites SET status = 'revoked', revoked_at = now()
    WHERE parent_id = v_context.featured_talent_id AND status = 'pending';
  UPDATE public.featured_talent_workspaces SET ended_at = coalesce(ended_at,now()) WHERE project_id = p_project_id;
END;
$$;
REVOKE ALL ON FUNCTION public.leave_featured_talent_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_featured_talent_workspace(uuid) TO authenticated;

-- Enforce restrictions at the database boundary, including older/web clients and RPCs.
CREATE OR REPLACE FUNCTION public.guard_featured_workspace_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_context public.featured_talent_workspaces;
BEGIN
  SELECT * INTO v_context FROM public.featured_talent_workspaces WHERE project_id = OLD.id;
  IF v_context.project_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF v_context.ended_at IS NULL AND EXISTS(SELECT 1 FROM auth.users WHERE id = v_context.owner_id) THEN
      RAISE EXCEPTION 'Leave the event before deleting this private project.' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.poster_id IS DISTINCT FROM OLD.poster_id OR NEW.casting_link_access IS DISTINCT FROM 'invited'
     OR NOT NEW.is_composable OR NEW.project_type IS DISTINCT FROM OLD.project_type THEN
    RAISE EXCEPTION 'This event team project stays private, invitation-only and owned by its featured talent.' USING ERRCODE = '42501';
  END IF;
  -- Casting editors may send their default visibility; never turn this into public discovery.
  NEW.visibility := 'private';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_featured_workspace_project() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_featured_workspace_project BEFORE UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_featured_workspace_project();

CREATE OR REPLACE FUNCTION public.guard_featured_workspace_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_project uuid; v_old_project uuid;
BEGIN
  IF TG_TABLE_NAME = 'casting_shortlist_shares' THEN
    IF EXISTS(SELECT 1 FROM public.roles r JOIN public.featured_talent_workspaces w ON w.project_id = r.project_id
      WHERE r.id = NEW.role_id OR r.id = ANY(coalesce(NEW.role_ids,'{}'::uuid[]))) THEN
      RAISE EXCEPTION 'Client share links are not available for private event team projects.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  v_project := NEW.project_id;
  IF TG_OP = 'UPDATE' THEN v_old_project := OLD.project_id; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.featured_talent_workspaces WHERE project_id IN (v_project,v_old_project)) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'roles' THEN
    IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION 'Roles cannot be moved out of a private event team project.' USING ERRCODE = '42501';
    END IF;
    NEW.visibility := 'private';
  ELSIF TG_TABLE_NAME = 'project_abilities' THEN
    IF NEW.ability NOT IN ('casting','booking') THEN
      RAISE EXCEPTION 'This project includes People, Groups, Schedule and Messages, with optional Casting and Confirmations.' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_TABLE_NAME = 'activities' THEN
    RAISE EXCEPTION 'Use the project schedule for rehearsals. Separate classes and events are not available here.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_featured_workspace_content() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zz_guard_featured_workspace_roles BEFORE INSERT OR UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_featured_workspace_content();
CREATE TRIGGER guard_featured_workspace_abilities BEFORE INSERT OR UPDATE ON public.project_abilities
  FOR EACH ROW EXECUTE FUNCTION public.guard_featured_workspace_content();
CREATE TRIGGER guard_featured_workspace_activities BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.guard_featured_workspace_content();
CREATE TRIGGER guard_featured_workspace_shares BEFORE INSERT OR UPDATE ON public.casting_shortlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.guard_featured_workspace_content();

-- Home entry points include invitations that have not been opened yet, and detached private work.
CREATE OR REPLACE FUNCTION public.list_my_featured_talent_workspaces()
RETURNS TABLE(featured_talent_id uuid,project_id uuid,event_id uuid,event_title text,invitation_status text,ended boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT f.id,w.project_id,f.activity_id,a.title,f.status,w.ended_at IS NOT NULL
  FROM public.activity_featured_talent f JOIN public.activities a ON a.id = f.activity_id
  LEFT JOIN public.featured_talent_workspaces w ON w.featured_talent_id = f.id AND w.owner_id = auth.uid()
  WHERE auth.uid() IS NOT NULL AND f.talent_user_id = auth.uid() AND f.parent_id IS NULL
    AND f.workspace_enabled AND f.status IN ('pending','accepted')
  UNION ALL
  SELECT w.featured_talent_id,w.project_id,w.event_id,w.event_title,'removed',true
  FROM public.featured_talent_workspaces w WHERE w.owner_id = auth.uid() AND w.ended_at IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.activity_featured_talent f WHERE f.id = w.featured_talent_id
      AND f.talent_user_id = auth.uid() AND f.workspace_enabled AND f.status IN ('pending','accepted'));
$$;
REVOKE ALL ON FUNCTION public.list_my_featured_talent_workspaces() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_featured_talent_workspaces() TO authenticated;

DROP FUNCTION IF EXISTS public.list_my_projects();

CREATE FUNCTION public.list_my_projects()
RETURNS TABLE (
  id uuid,
  poster_id uuid,
  title text,
  location text,
  start_date date,
  end_date date,
  cover_image_url text,
  visibility text,
  is_active boolean,
  is_composable boolean,
  is_owner boolean,
  created_at timestamptz,
  updated_at timestamptz,
  abilities text[],
  role_count integer,
  published_role_count integer,
  pending_submission_count integer,
  roster_list_id uuid,
  roster_member_count integer,
  class_session_count integer,
  published_class_session_count integer,
  next_session_date date,
  member_count integer,
  team_role text,
  cover_thumbnail_alignment text,
  featured_workspace jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH mine AS (
    SELECT ids.project_id
    FROM public.user_project_ids(auth.uid()) AS ids(project_id)
  )
  SELECT
    p.id,
    p.poster_id,
    p.title,
    p.location,
    p.start_date,
    p.end_date,
    p.cover_image_url,
    p.visibility,
    COALESCE(p.is_active, true),
    p.is_composable,
    p.poster_id = auth.uid(),
    p.created_at,
    p.updated_at,
    COALESCE((
      SELECT array_agg(a.ability ORDER BY a.enabled_at, a.ability)
      FROM public.project_abilities a WHERE a.project_id = p.id
    ), '{}'::text[]),
    (SELECT count(*)::int FROM public.roles r WHERE r.project_id = p.id),
    (
      SELECT count(*)::int FROM public.roles r
      WHERE r.project_id = p.id
        AND COALESCE(r.is_active, true)
        AND public.project_is_published_casting(p)
    ),
    (
      SELECT count(*)::int
      FROM public.submissions s
      JOIN public.roles r ON r.id = s.role_id
      WHERE r.project_id = p.id AND s.status = 'pending'
    ),
    roster.id,
    COALESCE((
      SELECT count(*)::int FROM public.talent_list_members m WHERE m.list_id = roster.id
    ), 0),
    (
      SELECT count(*)::int FROM public.activities act
      WHERE act.project_id = p.id AND act.status <> 'cancelled'
    ),
    (
      SELECT count(*)::int FROM public.activities act
      WHERE act.project_id = p.id AND act.status = 'active'
    ),
    (
      SELECT min(act.activity_date) FROM public.activities act
      WHERE act.project_id = p.id
        AND act.status IN ('active', 'draft')
        AND act.activity_date >= current_date
    ),
    (SELECT count(*)::int FROM public.project_members pm WHERE pm.project_id = p.id),
    CASE
      WHEN p.poster_id = auth.uid() THEN 'owner'
      WHEN EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
      ) THEN 'admin'
      ELSE COALESCE((
        SELECT pm.role FROM public.project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        LIMIT 1
      ), 'collaborator')
    END,
    p.cover_thumbnail_alignment,
    (SELECT jsonb_build_object('featured_talent_id',w.featured_talent_id,'event_id',w.event_id,
      'event_title',w.event_title,'ended',w.ended_at IS NOT NULL)
     FROM public.featured_talent_workspaces w WHERE w.project_id = p.id)
  FROM public.projects p
  JOIN mine ON mine.project_id = p.id
  LEFT JOIN LATERAL (
    SELECT tl.id FROM public.talent_lists tl
    WHERE tl.project_id = p.id AND tl.kind = 'project_roster'
    LIMIT 1
  ) roster ON true
  ORDER BY p.updated_at DESC, p.id;
$$;

REVOKE ALL ON FUNCTION public.list_my_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_projects() TO authenticated;
