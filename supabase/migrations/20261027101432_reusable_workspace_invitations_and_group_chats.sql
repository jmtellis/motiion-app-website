-- Reusable, revocable links grant participant access only after explicit acceptance.
CREATE TABLE public.workspace_invite_links (
 project_id uuid PRIMARY KEY REFERENCES public.featured_talent_workspaces(project_id) ON DELETE CASCADE,
 token text NOT NULL UNIQUE DEFAULT ('ws_' || replace(gen_random_uuid()::text,'-','')),
 enabled boolean NOT NULL DEFAULT false,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
ALTER TABLE public.workspace_invite_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_invite_links FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.workspace_invite_links TO service_role;

CREATE OR REPLACE FUNCTION public.workspace_invite_link(p_project_id uuid,p_enabled boolean DEFAULT NULL,p_rotate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.workspace_invite_links;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_project_operator(p_project_id,auth.uid()) THEN RAISE EXCEPTION 'Only workspace owners and admins can manage invitations.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.featured_talent_workspaces WHERE project_id=p_project_id AND ended_at IS NULL AND featured_talent_id IS NOT NULL) THEN RAISE EXCEPTION 'This event connection has ended.'; END IF;
 INSERT INTO public.workspace_invite_links(project_id) VALUES(p_project_id) ON CONFLICT DO NOTHING;
 SELECT * INTO l FROM public.workspace_invite_links WHERE project_id=p_project_id FOR UPDATE;
 UPDATE public.workspace_invite_links SET
  enabled=coalesce(p_enabled,enabled),
  token=CASE WHEN p_rotate OR (p_enabled=true AND expires_at<=now()) THEN 'ws_' || replace(gen_random_uuid()::text,'-','') ELSE token END,
  expires_at=CASE WHEN p_rotate OR (p_enabled=true AND expires_at<=now()) THEN now()+interval '30 days' ELSE expires_at END
 WHERE project_id=p_project_id RETURNING * INTO l;
 RETURN to_jsonb(l);
END $$;
REVOKE ALL ON FUNCTION public.workspace_invite_link(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workspace_invite_link(uuid,boolean,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_invite_card(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.workspace_invite_links; w public.featured_talent_workspaces;
BEGIN
 SELECT * INTO l FROM public.workspace_invite_links WHERE token=lower(trim(p_token)) AND enabled AND expires_at>now();
 SELECT * INTO w FROM public.featured_talent_workspaces WHERE project_id=l.project_id AND ended_at IS NULL;
 IF w.project_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.activity_featured_talent WHERE id=w.featured_talent_id AND status='accepted' AND workspace_enabled) THEN RETURN jsonb_build_object('ok',false,'error','unavailable'); END IF;
 RETURN jsonb_build_object('ok',true,'project_id',w.project_id,'activity_id',w.event_id,'parent_id',w.featured_talent_id,'workspace_title',(SELECT title FROM public.projects WHERE id=w.project_id),'inviter_name',public._notif_profile_display_name(w.owner_id),'event_title',w.event_title,'group_name',(SELECT name FROM public.project_groups WHERE id=w.performer_group_id),'expires_at',l.expires_at,'token',l.token,'display_name','you');
END $$;
REVOKE ALL ON FUNCTION public.get_workspace_invite_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_invite_card(text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.join_featured_workspace(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.workspace_invite_links; w public.featured_talent_workspaces; f public.activity_featured_talent; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to join this workspace.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.workspace_invite_links WHERE token=lower(trim(p_token)) FOR UPDATE;
 IF l.project_id IS NULL OR NOT l.enabled OR l.expires_at<=now() THEN RAISE EXCEPTION 'This invitation link is no longer active.'; END IF;
 SELECT * INTO w FROM public.featured_talent_workspaces WHERE project_id=l.project_id AND ended_at IS NULL;
 IF w.project_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.activity_featured_talent WHERE id=w.featured_talent_id AND status='accepted' AND workspace_enabled) THEN RAISE EXCEPTION 'This event connection has ended.'; END IF;
 IF public.is_project_operator(w.project_id,uid) THEN RETURN w.project_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w.event_id::text || uid::text,0));
 SELECT * INTO f FROM public.activity_featured_talent WHERE activity_id=w.event_id AND talent_user_id=uid ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF f.id IS NOT NULL AND f.parent_id IS DISTINCT FROM w.featured_talent_id THEN RAISE EXCEPTION 'You are already listed under another performance at this event.'; END IF;
 IF f.id IS NULL THEN
  INSERT INTO public.activity_featured_talent(activity_id,talent_user_id,parent_id,invited_by_user_id,status,responded_at)
  VALUES(w.event_id,uid,w.featured_talent_id,w.owner_id,'accepted',now()) RETURNING * INTO f;
 ELSE
  UPDATE public.activity_featured_talent SET status='accepted',responded_at=now() WHERE id=f.id RETURNING * INTO f;
 END IF;
 PERFORM public.enroll_featured_workspace_performer(f.id);
 RETURN w.project_id;
END $$;
REVOKE ALL ON FUNCTION public.join_featured_workspace(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_featured_workspace(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.invite_featured_workspace_person(p_project_id uuid,p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.featured_talent_workspaces; f public.activity_featured_talent;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_project_operator(p_project_id,auth.uid()) THEN RAISE EXCEPTION 'Only workspace owners and admins can invite people.' USING ERRCODE='42501'; END IF;
 SELECT * INTO w FROM public.featured_talent_workspaces WHERE project_id=p_project_id AND ended_at IS NULL;
 IF w.project_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.activity_featured_talent WHERE id=w.featured_talent_id AND status='accepted' AND workspace_enabled) THEN RAISE EXCEPTION 'This event connection has ended.'; END IF;
 IF p_user_id=w.owner_id THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w.event_id::text || p_user_id::text,0));
 SELECT * INTO f FROM public.activity_featured_talent WHERE activity_id=w.event_id AND talent_user_id=p_user_id ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF f.id IS NOT NULL AND f.parent_id IS DISTINCT FROM w.featured_talent_id THEN RAISE EXCEPTION 'This person is already listed under another performance.'; END IF;
 IF f.id IS NULL THEN
  INSERT INTO public.activity_featured_talent(activity_id,talent_user_id,parent_id,invited_by_user_id,status)
  VALUES(w.event_id,p_user_id,w.featured_talent_id,auth.uid(),'pending');
 ELSIF f.status NOT IN ('pending','accepted') THEN
  UPDATE public.activity_featured_talent SET status='pending',invited_by_user_id=auth.uid() WHERE id=f.id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.invite_featured_workspace_person(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.invite_featured_workspace_person(uuid,uuid) TO authenticated;

-- One canonical conversation for each named project group, including concurrent opens.
CREATE TABLE public.project_group_conversations (
 group_id uuid PRIMARY KEY REFERENCES public.project_groups(id) ON DELETE CASCADE,
 conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE
);
ALTER TABLE public.project_group_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_group_conversations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.project_group_conversations TO authenticated;
GRANT ALL ON public.project_group_conversations TO service_role;
CREATE POLICY project_group_conversations_read ON public.project_group_conversations FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.project_groups g WHERE g.id=group_id AND public.user_is_on_project(g.project_id,(SELECT auth.uid()))));

CREATE OR REPLACE FUNCTION public.open_project_group_chat(p_group_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.project_groups; cid uuid; uid uuid:=auth.uid(); members uuid[];
BEGIN
 SELECT * INTO g FROM public.project_groups WHERE id=p_group_id AND archived_at IS NULL FOR UPDATE;
 IF uid IS NULL OR g.id IS NULL OR NOT public.user_is_on_project(g.project_id,uid) THEN RAISE EXCEPTION 'This group is not available.' USING ERRCODE='42501'; END IF;
 SELECT array_agg(pp.user_id ORDER BY pp.user_id) INTO members FROM public.project_group_members gm JOIN public.project_participants pp ON pp.id=gm.participant_id WHERE gm.group_id=g.id AND pp.removed_at IS NULL;
 IF NOT public.is_project_operator(g.project_id,uid) AND NOT coalesce(uid=ANY(members),false) THEN RAISE EXCEPTION 'Only this group’s members can open its chat.' USING ERRCODE='42501'; END IF;
 SELECT conversation_id INTO cid FROM public.project_group_conversations WHERE group_id=g.id;
 IF cid IS NULL THEN
  -- Reuse a legacy group chat only when its name and membership match exactly.
  SELECT c.id INTO cid FROM public.conversations c WHERE c.context_type='project' AND c.context_id=g.project_id AND c.title=g.name
   AND ARRAY(SELECT cp.user_id FROM public.conversation_participants cp WHERE cp.conversation_id=c.id AND cp.user_id<>c.created_by ORDER BY cp.user_id)
     = ARRAY(SELECT m FROM unnest(coalesce(members,'{}'::uuid[])) m WHERE m<>c.created_by ORDER BY m)
  ORDER BY c.created_at LIMIT 1;
  IF cid IS NULL THEN
   IF coalesce(cardinality(members),0)=0 THEN RAISE EXCEPTION 'Add people to this group before starting its chat.'; END IF;
   INSERT INTO public.conversations(type,context_type,context_id,created_by,title) VALUES('event','project',g.project_id,uid,g.name) RETURNING id INTO cid;
  END IF;
  INSERT INTO public.project_group_conversations(group_id,conversation_id) VALUES(g.id,cid);
 END IF;
 INSERT INTO public.conversation_participants(conversation_id,user_id,role) VALUES(cid,uid,CASE WHEN public.is_project_operator(g.project_id,uid) THEN 'organizer' ELSE 'attendee' END) ON CONFLICT(conversation_id,user_id) DO NOTHING;
 INSERT INTO public.conversation_participants(conversation_id,user_id) SELECT cid,m FROM unnest(coalesce(members,'{}'::uuid[])) m ON CONFLICT(conversation_id,user_id) DO NOTHING;
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.open_project_group_chat(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_project_group_chat(uuid) TO authenticated;
