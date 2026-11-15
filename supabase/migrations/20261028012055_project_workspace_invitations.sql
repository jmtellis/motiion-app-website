-- Project invitations support people who register after receiving a link.
-- Admin links are bound to a verified email and consumed once; participant links never grant admin access.
CREATE TABLE public.project_workspace_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('participant','admin')),
 email text NOT NULL DEFAULT '',
 token text NOT NULL UNIQUE DEFAULT ('ws_' || replace(gen_random_uuid()::text,'-','')),
 enabled boolean NOT NULL DEFAULT false,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 CHECK ((role='participant' AND email='') OR (role='admin' AND email=lower(trim(email)) AND position('@' IN email)>1)),
 UNIQUE(project_id,role,email)
);
CREATE INDEX project_workspace_invitations_inviter_idx ON public.project_workspace_invitations(invited_by);
CREATE INDEX project_workspace_invitations_accepted_idx ON public.project_workspace_invitations(accepted_by);
ALTER TABLE public.project_workspace_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_workspace_invitations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.project_workspace_invitations TO service_role;

CREATE FUNCTION public.project_invitation_link(p_project_id uuid,p_email text DEFAULT NULL,p_enabled boolean DEFAULT NULL,p_rotate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.project_workspace_invitations; owner_id uuid; invite_role text; address text:=lower(trim(coalesce(p_email,'')));
BEGIN
 SELECT poster_id INTO owner_id FROM public.projects WHERE id=p_project_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.is_project_operator(p_project_id,auth.uid()) THEN RAISE EXCEPTION 'Only project owners and admins can manage invitations.' USING ERRCODE='42501'; END IF;
 invite_role:=CASE WHEN address='' THEN 'participant' ELSE 'admin' END;
 IF invite_role='admin' AND owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the project owner can invite admins.' USING ERRCODE='42501'; END IF;
 IF invite_role='admin' AND address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email address.' USING ERRCODE='22023'; END IF;
 IF invite_role='participant' AND EXISTS(SELECT 1 FROM public.featured_talent_workspaces WHERE project_id=p_project_id) THEN RAISE EXCEPTION 'Use the featured workspace invitation.'; END IF;
 INSERT INTO public.project_workspace_invitations(project_id,invited_by,role,email) VALUES(p_project_id,auth.uid(),invite_role,address) ON CONFLICT DO NOTHING;
 SELECT * INTO l FROM public.project_workspace_invitations WHERE project_id=p_project_id AND role=invite_role AND email=address FOR UPDATE;
 UPDATE public.project_workspace_invitations SET enabled=coalesce(p_enabled,enabled),
 token=CASE WHEN p_rotate OR (p_enabled=true AND (expires_at<=now() OR accepted_by IS NOT NULL)) THEN 'ws_'||replace(gen_random_uuid()::text,'-','') ELSE token END,
 expires_at=CASE WHEN p_rotate OR (p_enabled=true AND (expires_at<=now() OR accepted_by IS NOT NULL)) THEN now()+interval '30 days' ELSE expires_at END,
 accepted_by=CASE WHEN p_rotate OR p_enabled=true THEN NULL ELSE accepted_by END,
 invited_by=auth.uid()
 WHERE id=l.id RETURNING * INTO l;
 RETURN jsonb_build_object('token',l.token,'enabled',l.enabled,'expires_at',l.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.project_invitation_link(uuid,text,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.project_invitation_link(uuid,text,boolean,boolean) TO authenticated;

CREATE FUNCTION public.project_invitation_card(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.project_workspace_invitations; p public.projects;
BEGIN
 SELECT * INTO l FROM public.project_workspace_invitations WHERE token=lower(trim(p_token)) AND enabled AND expires_at>now();
 SELECT * INTO p FROM public.projects WHERE id=l.project_id;
 IF p.id IS NULL OR NOT public.is_project_operator(p.id,l.invited_by) OR (l.role='admin' AND p.poster_id<>l.invited_by) THEN RETURN jsonb_build_object('ok',false); END IF;
 RETURN jsonb_build_object('ok',true,'project_id',p.id,'workspace_title',p.title,'inviter_name',public._notif_profile_display_name(l.invited_by),'invitation_role',l.role,'expires_at',l.expires_at,'token',l.token,'display_name','you');
END $$;
REVOKE ALL ON FUNCTION public.project_invitation_card(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.accept_project_workspace_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.project_workspace_invitations; uid uuid:=auth.uid(); owner_id uuid; engagement uuid; participant uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to join this workspace.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.project_workspace_invitations WHERE token=lower(trim(p_token)) FOR UPDATE;
 IF l.id IS NULL OR NOT l.enabled OR l.expires_at<=now() THEN RAISE EXCEPTION 'This invitation link is no longer active.'; END IF;
 SELECT poster_id INTO owner_id FROM public.projects WHERE id=l.project_id;
 IF NOT public.is_project_operator(l.project_id,l.invited_by) OR (l.role='admin' AND owner_id IS DISTINCT FROM l.invited_by) THEN RAISE EXCEPTION 'This invitation link is no longer active.'; END IF;
 IF l.role='admin' THEN
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND lower(email)=l.email AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Sign in with the verified email address this admin invitation was sent to.' USING ERRCODE='42501'; END IF;
  IF uid<>owner_id THEN
   PERFORM set_config('motiion.admin_invite','on',true);
   INSERT INTO public.project_members(project_id,user_id,role) VALUES(l.project_id,uid,'admin') ON CONFLICT(project_id,user_id) DO UPDATE SET role='admin';
  END IF;
  UPDATE public.project_workspace_invitations SET enabled=false,accepted_by=uid WHERE id=l.id;
 ELSE
  IF public.is_project_operator(l.project_id,uid) THEN RETURN l.project_id; END IF;
  engagement:=public.ensure_talent_engagement(l.project_id,uid,l.invited_by);
  INSERT INTO public.project_participants(project_id,user_id,engagement_id,added_by) VALUES(l.project_id,uid,engagement,l.invited_by)
  ON CONFLICT(project_id,user_id) DO UPDATE SET removed_at=NULL,removed_by=NULL,engagement_id=excluded.engagement_id,added_by=excluded.added_by
  RETURNING id INTO participant;
  PERFORM public.insert_talent_engagement_event(engagement,'membership_added','participant',participant,jsonb_build_object('participant_id',participant),uid);
 END IF;
 RETURN l.project_id;
END $$;
REVOKE ALL ON FUNCTION public.accept_project_workspace_invitation(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_invite_card(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.workspace_invite_links; w public.featured_talent_workspaces;
BEGIN
 IF EXISTS(SELECT 1 FROM public.project_workspace_invitations WHERE token=lower(trim(p_token))) THEN RETURN public.project_invitation_card(p_token); END IF;
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
 IF EXISTS(SELECT 1 FROM public.project_workspace_invitations WHERE token=lower(trim(p_token))) THEN RETURN public.accept_project_workspace_invitation(p_token); END IF;
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
