-- One explicit public-lineup group per private workspace. Other groups stay private.
ALTER TABLE public.featured_talent_workspaces
  ADD COLUMN performer_group_id uuid UNIQUE REFERENCES public.project_groups(id) ON DELETE SET NULL;

-- Internal helper: called only after an accepted event invitation or by workspace setup.
CREATE OR REPLACE FUNCTION public.enroll_featured_workspace_performer(p_featured_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE f public.activity_featured_talent; w public.featured_talent_workspaces; participant uuid; engagement uuid;
BEGIN
  SELECT * INTO f FROM public.activity_featured_talent WHERE id = p_featured_id;
  IF f.parent_id IS NULL OR f.status <> 'accepted' OR f.talent_user_id IS NULL THEN RETURN; END IF;
  SELECT * INTO w FROM public.featured_talent_workspaces
    WHERE featured_talent_id = f.parent_id AND ended_at IS NULL;
  IF w.performer_group_id IS NULL THEN RETURN; END IF;
  engagement := public.ensure_talent_engagement(w.project_id, f.talent_user_id, w.owner_id);
  INSERT INTO public.project_participants(project_id,user_id,engagement_id,added_by)
    VALUES(w.project_id,f.talent_user_id,engagement,w.owner_id)
    ON CONFLICT(project_id,user_id) DO UPDATE SET removed_at=NULL,removed_by=NULL
    RETURNING id INTO participant;
  -- Invitation acceptance grants ordinary team access, never administrative access.
  INSERT INTO public.project_members(project_id,user_id,role)
    VALUES(w.project_id,f.talent_user_id,'collaborator') ON CONFLICT(project_id,user_id) DO NOTHING;
  INSERT INTO public.project_group_members(group_id,participant_id)
    VALUES(w.performer_group_id,participant) ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_featured_workspace_performer(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.setup_featured_workspace_performers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE group_name text; child record;
BEGIN
  SELECT CASE WHEN talent_appearance = 'billed_artist_credits' THEN 'Credits' ELSE 'Featured Performers' END
    INTO group_name FROM public.activities WHERE id = NEW.event_id;
  IF NEW.performer_group_id IS NULL THEN
    INSERT INTO public.project_groups(project_id,name,created_by)
      VALUES(NEW.project_id,coalesce(group_name,'Featured Performers'),NEW.owner_id)
      RETURNING id INTO NEW.performer_group_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.setup_featured_workspace_performers() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER setup_featured_workspace_performers BEFORE INSERT ON public.featured_talent_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.setup_featured_workspace_performers();

CREATE OR REPLACE FUNCTION public.sync_featured_workspace_lineup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE w public.featured_talent_workspaces; user_id uuid; entry public.activity_featured_talent;
BEGIN
  SELECT * INTO w FROM public.featured_talent_workspaces
    WHERE performer_group_id = CASE WHEN TG_OP='DELETE' THEN OLD.group_id ELSE NEW.group_id END
      AND ended_at IS NULL;
  IF w.featured_talent_id IS NULL THEN RETURN NULL; END IF;
  SELECT pp.user_id INTO user_id FROM public.project_participants pp
    WHERE pp.id = CASE WHEN TG_OP='DELETE' THEN OLD.participant_id ELSE NEW.participant_id END;
  IF user_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO entry FROM public.activity_featured_talent f WHERE f.activity_id=w.event_id AND f.talent_user_id=user_id;
  IF TG_OP='DELETE' THEN
    UPDATE public.activity_featured_talent SET status='removed',responded_at=now()
      WHERE id=entry.id AND parent_id=w.featured_talent_id AND status IN ('accepted','pending');
  ELSE
    IF entry.id IS NOT NULL AND entry.parent_id IS DISTINCT FROM w.featured_talent_id THEN
      RAISE EXCEPTION 'This person is already listed elsewhere on this event.' USING ERRCODE='22023';
    END IF;
    IF entry.id IS NULL THEN
      INSERT INTO public.activity_featured_talent(activity_id,talent_user_id,parent_id,invited_by_user_id,status,responded_at)
        VALUES(w.event_id,user_id,w.featured_talent_id,w.owner_id,'accepted',now());
    ELSIF entry.status <> 'accepted' THEN
      UPDATE public.activity_featured_talent SET status='accepted',responded_at=now() WHERE id=entry.id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_featured_workspace_lineup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_featured_workspace_lineup AFTER INSERT OR DELETE ON public.project_group_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_featured_workspace_lineup();

CREATE OR REPLACE FUNCTION public.sync_featured_workspace_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.status='accepted' THEN
    PERFORM public.enroll_featured_workspace_performer(NEW.id);
  ELSE
    -- Removing a public credit removes it from the publishing group, preserving private work.
    DELETE FROM public.project_group_members gm USING public.project_participants pp,public.featured_talent_workspaces w
      WHERE gm.participant_id=pp.id AND gm.group_id=w.performer_group_id
        AND w.featured_talent_id=OLD.parent_id AND pp.user_id=OLD.talent_user_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_featured_workspace_membership() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_featured_workspace_membership AFTER INSERT OR UPDATE OF status OR DELETE ON public.activity_featured_talent
  FOR EACH ROW EXECUTE FUNCTION public.sync_featured_workspace_membership();

CREATE OR REPLACE FUNCTION public.finish_featured_workspace_setup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE child record;
BEGIN
  UPDATE public.projects SET title=coalesce(nullif(public._notif_profile_display_name(NEW.owner_id),''),'My team') WHERE id=NEW.project_id;
  FOR child IN SELECT id FROM public.activity_featured_talent WHERE parent_id=NEW.featured_talent_id AND status='accepted' LOOP
    PERFORM public.enroll_featured_workspace_performer(child.id);
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_featured_workspace_setup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER finish_featured_workspace_setup AFTER INSERT ON public.featured_talent_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.finish_featured_workspace_setup();

-- Existing workspaces receive the same group and accepted performers without duplicate entries.
DO $$ DECLARE w record; group_id uuid; child record;
BEGIN
  FOR w IN SELECT context.*,a.talent_appearance FROM public.featured_talent_workspaces context LEFT JOIN public.activities a ON a.id=context.event_id LOOP
    INSERT INTO public.project_groups(project_id,name,created_by)
      VALUES(w.project_id,CASE WHEN w.talent_appearance='billed_artist_credits' THEN 'Credits' ELSE 'Featured Performers' END,w.owner_id)
      RETURNING id INTO group_id;
    UPDATE public.featured_talent_workspaces SET performer_group_id=group_id WHERE project_id=w.project_id;
    UPDATE public.projects SET title=coalesce(nullif(public._notif_profile_display_name(w.owner_id),''),'My team')
      WHERE id=w.project_id AND title LIKE '% · My team';
    IF w.ended_at IS NULL THEN
      FOR child IN SELECT id FROM public.activity_featured_talent WHERE parent_id=w.featured_talent_id AND status='accepted' LOOP
        PERFORM public.enroll_featured_workspace_performer(child.id);
      END LOOP;
    END IF;
  END LOOP;
END $$;
