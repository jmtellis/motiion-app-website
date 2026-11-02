-- Industry quotas are transactional and account-scoped; deleting content never refunds usage.
CREATE SCHEMA IF NOT EXISTS industry_private;
REVOKE ALL ON SCHEMA industry_private FROM PUBLIC, anon, authenticated;
CREATE TABLE industry_private.publications (
  project_id uuid PRIMARY KEY, -- deliberately no content FK: deletion must not refund quota
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON industry_private.publications(owner_id, published_at);
CREATE TABLE industry_private.review_projects (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL, -- durable even after project/share deletion
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, project_id)
);
ALTER TABLE industry_private.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_private.review_projects ENABLE ROW LEVEL SECURITY;
-- Unknown historical publish dates: start the rolling window at rollout, never guess creation = publish.
INSERT INTO industry_private.publications(project_id,owner_id)
SELECT id,poster_id FROM public.projects p WHERE public.project_is_published_casting(p)
 OR (coalesce(p.casting_configuration->>'composer_draft','false')<>'true' AND EXISTS(SELECT 1 FROM public.roles r WHERE r.project_id=p.id));
-- Grandfather every previously shared project; those owners have used their one-time trial.
INSERT INTO industry_private.review_projects(owner_id,project_id,started_at)
SELECT s.owner_user_id,coalesce(r.project_id,r.id),min(s.created_at)
FROM public.casting_shortlist_shares s JOIN public.roles r ON r.id=s.role_id
JOIN auth.users u ON u.id=s.owner_user_id
GROUP BY s.owner_user_id,coalesce(r.project_id,r.id);

CREATE FUNCTION industry_private.lock_owner(p_owner uuid) RETURNS void
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT pg_advisory_xact_lock(hashtextextended('industry-plan:' || p_owner::text,0));
$$;
CREATE FUNCTION industry_private.project_open(p public.projects) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT public.project_is_published_casting(p)
 AND (NOT EXISTS(SELECT 1 FROM public.roles r WHERE r.project_id=p.id)
      OR EXISTS(SELECT 1 FROM public.roles r WHERE r.project_id=p.id AND coalesce(r.is_active,true)
        AND NOT coalesce(r.is_casting_finalized,false)
        AND (coalesce(r.submission_deadline,nullif(p.casting_configuration->>'submission_deadline_iso8601','')::timestamptz) IS NULL OR coalesce(r.submission_deadline,nullif(p.casting_configuration->>'submission_deadline_iso8601','')::timestamptz)>now())));
$$;
CREATE FUNCTION industry_private.assert_publish(p_owner uuid,p_project uuid,p_first boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM industry_private.lock_owner(p_owner);
 IF public.effective_choreographer_plan_tier(p_owner)='pro' THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.projects p WHERE p.poster_id=p_owner AND p.id<>p_project AND industry_private.project_open(p)) THEN
  RAISE EXCEPTION 'Free includes one casting accepting applications. Close applications before publishing or reopening another, or upgrade to Industry Pro.' USING ERRCODE='P0001',HINT='industry_upgrade_required';
 END IF;
 IF EXISTS(SELECT 1 FROM industry_private.publications h WHERE h.owner_id=p_owner
    AND h.published_at>now()-interval '30 days' AND (p_first OR h.project_id<>p_project)) THEN
  RAISE EXCEPTION 'Free includes one new casting every rolling 30 days. Closing or deleting does not reset this allowance. Upgrade to Industry Pro for unlimited publishing.' USING ERRCODE='P0001',HINT='industry_upgrade_required';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.enforce_choreographer_casting_publish_quota() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE first_publish boolean; was_open boolean:=false;
BEGIN
 IF TG_OP='UPDATE' AND NEW.poster_id IS DISTINCT FROM OLD.poster_id THEN
  RAISE EXCEPTION 'Casting ownership cannot be reassigned.' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM industry_private.publications WHERE project_id=NEW.id) THEN
  RAISE EXCEPTION 'A deleted published casting cannot reuse its ID, including as a draft.' USING ERRCODE='42501';
 END IF;
 IF NOT public.project_is_published_casting(NEW) THEN RETURN NEW; END IF;
 PERFORM industry_private.lock_owner(NEW.poster_id);
 SELECT NOT EXISTS(SELECT 1 FROM industry_private.publications WHERE project_id=NEW.id) INTO first_publish;
 IF TG_OP='INSERT' AND NOT first_publish THEN
  RAISE EXCEPTION 'A deleted published casting cannot be recreated with the same ID.' USING ERRCODE='42501';
 END IF;
 IF TG_OP='UPDATE' THEN was_open:=industry_private.project_open(OLD); END IF;
 IF first_publish OR (industry_private.project_open(NEW) AND NOT was_open) THEN
  PERFORM industry_private.assert_publish(NEW.poster_id,NEW.id,first_publish);
 END IF;
 IF first_publish THEN INSERT INTO industry_private.publications(project_id,owner_id) VALUES(NEW.id,NEW.poster_id); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_choreographer_casting_publish_quota ON public.projects;
CREATE TRIGGER trg_enforce_choreographer_casting_publish_quota BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_choreographer_casting_publish_quota();
-- Role reopening and deadline extensions must not bypass the project-level cap.
CREATE FUNCTION industry_private.guard_role_reopen() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.projects;
BEGIN
 IF TG_OP='UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
  RAISE EXCEPTION 'Casting roles cannot be moved between projects.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO p FROM public.projects WHERE id=NEW.project_id;
 IF p.id IS NULL OR NOT public.project_is_published_casting(p) THEN RETURN NEW; END IF;
 IF coalesce(NEW.is_active,true) AND NOT coalesce(NEW.is_casting_finalized,false)
 AND (coalesce(NEW.submission_deadline,nullif(p.casting_configuration->>'submission_deadline_iso8601','')::timestamptz) IS NULL
 OR coalesce(NEW.submission_deadline,nullif(p.casting_configuration->>'submission_deadline_iso8601','')::timestamptz)>now())
 AND NOT industry_private.project_open(p) THEN
  PERFORM industry_private.assert_publish(p.poster_id,p.id,false);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_role_reopen BEFORE INSERT OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION industry_private.guard_role_reopen();
-- Replace the legacy count RPC semantics for old clients and the old RPC preflight.
CREATE OR REPLACE FUNCTION public.count_choreographer_published_castings(p_poster_id uuid,p_exclude_project_id uuid DEFAULT NULL)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM industry_private.publications h WHERE h.owner_id=p_poster_id AND h.published_at>now()-interval '30 days'
    AND (p_exclude_project_id IS NULL OR h.project_id<>p_exclude_project_id))
 OR EXISTS(SELECT 1 FROM public.projects p WHERE p.poster_id=p_poster_id AND industry_private.project_open(p)
    AND (p_exclude_project_id IS NULL OR p.id<>p_exclude_project_id)) THEN 1 ELSE 0 END;
$$;
-- Read-only preflight never reserves an allowance. Triggers remain authoritative.
CREATE FUNCTION public.industry_feature_access(p_feature text,p_project_id uuid DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RETURN false; END IF;
 IF p_feature='groups' AND p_project_id IS NOT NULL THEN
   IF NOT public.is_project_operator(p_project_id,uid) THEN RETURN false; END IF;
   SELECT poster_id INTO uid FROM public.projects WHERE id=p_project_id;
 END IF;
 IF public.effective_choreographer_plan_tier(uid)='pro' THEN RETURN true; END IF;
 IF p_feature='publish' THEN RETURN public.count_choreographer_published_castings(uid,NULL)=0; END IF;
 IF p_feature='roster' THEN RETURN (SELECT count(*)<3 FROM public.talent_lists WHERE owner_id=uid AND kind='roster'); END IF;
 IF p_feature='client_review' THEN RETURN NOT EXISTS(SELECT 1 FROM industry_private.review_projects WHERE owner_id=uid)
   OR EXISTS(SELECT 1 FROM industry_private.review_projects WHERE owner_id=uid AND project_id=p_project_id); END IF;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.industry_feature_access(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.industry_feature_access(text,uuid) TO authenticated;

CREATE FUNCTION industry_private.guard_roster() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.owner_id,NEW.kind) IS DISTINCT FROM (OLD.owner_id,OLD.kind) THEN
  RAISE EXCEPTION 'Roster ownership and type cannot be changed.' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' THEN
  PERFORM industry_private.lock_owner(NEW.owner_id);
  IF NEW.kind NOT IN ('roster','favorites','project_roster') OR NEW.kind IS NULL THEN RAISE EXCEPTION 'Invalid roster type.'; END IF;
  IF NEW.kind='favorites' AND EXISTS(SELECT 1 FROM public.talent_lists WHERE owner_id=NEW.owner_id AND kind='favorites') THEN
   RAISE EXCEPTION 'Use your existing Saved Talent list.';
  END IF;
  IF NEW.kind='project_roster' AND (NEW.project_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.projects WHERE id=NEW.project_id AND poster_id=NEW.owner_id)) THEN
   RAISE EXCEPTION 'A project cast list must belong to its owner’s project.' USING ERRCODE='42501';
  END IF;
 END IF;
 IF NEW.kind='favorites' THEN NEW.name:='Saved Talent'; END IF;
 IF TG_OP='UPDATE' AND NEW.kind='project_roster' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
  RAISE EXCEPTION 'Project cast lists cannot be moved.' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' AND NEW.kind='roster' THEN
  PERFORM industry_private.lock_owner(NEW.owner_id);
  IF public.effective_choreographer_plan_tier(NEW.owner_id)<>'pro'
   AND (SELECT count(*) FROM public.talent_lists WHERE owner_id=NEW.owner_id AND kind='roster')>=3 THEN
   RAISE EXCEPTION 'Free includes 3 custom rosters with unlimited talent. Upgrade to Industry Pro for more.' USING HINT='industry_upgrade_required';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_roster_limit BEFORE INSERT OR UPDATE ON public.talent_lists FOR EACH ROW EXECUTE FUNCTION industry_private.guard_roster();
CREATE FUNCTION industry_private.guard_roster_share() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid;
BEGIN
 SELECT owner_id INTO owner FROM public.talent_lists WHERE id=NEW.list_id;
 IF public.effective_choreographer_plan_tier(owner)<>'pro' THEN
  IF TG_OP='UPDATE' AND NEW.list_id=OLD.list_id
   AND (NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at OR (NEW.expires_at IS NOT NULL AND (OLD.expires_at IS NULL OR NEW.expires_at<=OLD.expires_at)))
   AND (to_jsonb(NEW)-'expires_at'-'updated_at')=(to_jsonb(OLD)-'expires_at'-'updated_at') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Sharing rosters, including expiring links, requires Industry Pro. Existing shares can still expire or be revoked.' USING HINT='industry_upgrade_required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_roster_share BEFORE INSERT OR UPDATE ON public.talent_list_user_shares FOR EACH ROW EXECUTE FUNCTION industry_private.guard_roster_share();
CREATE TRIGGER industry_roster_public_share BEFORE INSERT OR UPDATE ON public.talent_list_public_links FOR EACH ROW EXECUTE FUNCTION industry_private.guard_roster_share();
CREATE FUNCTION industry_private.guard_client_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; owner uuid;
BEGIN
 SELECT coalesce(project_id,id),poster_id INTO pid,owner FROM public.roles WHERE id=NEW.role_id;
 IF pid IS NULL OR owner IS DISTINCT FROM NEW.owner_user_id THEN RAISE EXCEPTION 'Invalid review owner or project.' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND (NEW.owner_user_id,NEW.role_id) IS DISTINCT FROM (OLD.owner_user_id,OLD.role_id) THEN
  RAISE EXCEPTION 'Reviews cannot be moved between owners or roles.' USING ERRCODE='42501';
 END IF;
 IF EXISTS(SELECT 1 FROM public.roles WHERE id=ANY(NEW.role_ids) AND coalesce(project_id,id) IS DISTINCT FROM pid) THEN
  RAISE EXCEPTION 'All review roles must belong to the same project.' USING ERRCODE='42501';
 END IF;
 IF NOT NEW.is_active THEN RETURN NEW; END IF;
 PERFORM industry_private.lock_owner(owner);
 IF public.effective_choreographer_plan_tier(owner)<>'pro'
 AND EXISTS(SELECT 1 FROM industry_private.review_projects WHERE owner_id=owner)
 AND NOT EXISTS(SELECT 1 FROM industry_private.review_projects WHERE owner_id=owner AND project_id=pid) THEN
  RAISE EXCEPTION 'Your one-project client review trial has been used. Upgrade to Industry Pro to share another project.' USING HINT='industry_upgrade_required';
 END IF;
 INSERT INTO industry_private.review_projects(owner_id,project_id) VALUES(owner,pid) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_client_review BEFORE INSERT OR UPDATE ON public.casting_shortlist_shares FOR EACH ROW EXECUTE FUNCTION industry_private.guard_client_review();
-- Create the default reviewer in the SAME transaction as a successful share.
CREATE FUNCTION industry_private.review_recipient() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.casting_shortlist_share_recipients(share_id,display_name,sort_order) VALUES(NEW.id,'Client',0);
 RETURN NEW;
END $$;
CREATE TRIGGER industry_review_recipient AFTER INSERT ON public.casting_shortlist_shares FOR EACH ROW EXECUTE FUNCTION industry_private.review_recipient();

CREATE FUNCTION industry_private.guard_group_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; owner uuid;
BEGIN
 IF TG_TABLE_NAME='project_groups' THEN pid:=NEW.project_id;
 ELSE SELECT project_id INTO pid FROM public.project_groups WHERE id=NEW.group_id; END IF;
 SELECT poster_id INTO owner FROM public.projects WHERE id=pid;
 -- Built-in public-lineup groups are provisioned by existing trusted triggers, not
 -- user-created advanced groups. Accepting an invitation must still work after downgrade.
 IF TG_OP='INSERT' AND pg_trigger_depth()>1 AND TG_TABLE_NAME='project_groups' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='project_group_members' AND TG_OP='INSERT' THEN
  IF EXISTS(SELECT 1 FROM public.featured_talent_workspaces w
   JOIN public.project_participants pp ON pp.id=NEW.participant_id
   JOIN public.activity_featured_talent f ON f.talent_user_id=pp.user_id AND f.parent_id=w.featured_talent_id
   WHERE w.performer_group_id=NEW.group_id AND f.status='accepted' AND w.ended_at IS NULL) THEN RETURN NEW; END IF;
 END IF;
 IF public.effective_choreographer_plan_tier(owner)<>'pro' THEN
  -- Archive an existing group after downgrade, but do not create/rename/expand it.
  IF TG_TABLE_NAME='project_groups' AND TG_OP='UPDATE' THEN
   IF NEW.archived_at IS NOT NULL AND (to_jsonb(NEW)-'archived_at')=(to_jsonb(OLD)-'archived_at') THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'Project groups, group schedules and contextual chats are included with Industry Pro.' USING HINT='industry_upgrade_required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_groups BEFORE INSERT OR UPDATE ON public.project_groups FOR EACH ROW EXECUTE FUNCTION industry_private.guard_group_workflow();
CREATE TRIGGER industry_group_members BEFORE INSERT OR UPDATE ON public.project_group_members FOR EACH ROW EXECUTE FUNCTION industry_private.guard_group_workflow();
-- Existing groups may lazily open their chat after downgrade. The existing
-- open_project_group_chat RPC still requires project/group membership; creating
-- the group and creating standalone contextual group chats remain Pro-only.
-- Existing conversations and participant reads/replies are deliberately untouched.
-- Schedule audiences are embedded in casting_configuration; compare only targeting, allowing
-- essential date/time/location corrections after downgrade. New groups/categories require Pro.
CREATE FUNCTION industry_private.schedule_targets(cfg jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(c->>'id_key',g.ids),'{}'::jsonb)
 FROM jsonb_array_elements(coalesce(cfg->'schedule_categories','[]'::jsonb)) c
 CROSS JOIN LATERAL (
  SELECT jsonb_agg(DISTINCT value ORDER BY value) AS ids FROM (
   SELECT value FROM jsonb_path_query(c,'$.applies_to_group_ids[*]') value
   UNION ALL SELECT value FROM jsonb_path_query(c,'$.applies_to_group_ids_by_day.*[*]') value
  ) targets
 ) g WHERE g.ids IS NOT NULL;
$$;
CREATE FUNCTION industry_private.guard_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous jsonb:='{}'; target jsonb; previous_details jsonb:='{}'; target_details jsonb;
BEGIN
 IF public.effective_choreographer_plan_tier(NEW.poster_id)='pro' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN previous:=industry_private.schedule_targets(OLD.casting_configuration); END IF;
 target:=industry_private.schedule_targets(NEW.casting_configuration);
 IF TG_OP='UPDATE' THEN previous_details:=industry_private.schedule_targets(OLD.project_details); END IF;
 target_details:=industry_private.schedule_targets(NEW.project_details);
 IF (target<>'{}'::jsonb AND NOT previous @> target)
 OR (target_details<>'{}'::jsonb AND NOT previous_details @> target_details) THEN
  RAISE EXCEPTION 'New group-specific schedules require Industry Pro. Existing schedule times and locations can still be corrected.' USING HINT='industry_upgrade_required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_group_schedule BEFORE INSERT OR UPDATE OF casting_configuration, project_details ON public.projects FOR EACH ROW EXECUTE FUNCTION industry_private.guard_schedule();
-- Individual outreach remains free for approved Industry; preserve Talent entitlement behavior.
CREATE OR REPLACE FUNCTION public.user_has_pro_messaging_outreach(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.effective_dancer_plan_tier(p_user_id)='pro' OR public.has_industry_approval(p_user_id),false);
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA industry_private FROM PUBLIC,anon,authenticated;

-- Close application intake without finalizing selection, deleting data or stopping project work.
CREATE FUNCTION public.close_industry_casting_applications(p_project_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_project_operator(p_project_id,auth.uid()) THEN
  RAISE EXCEPTION 'Only the project owner or an admin can close applications.' USING ERRCODE='42501';
 END IF;
 UPDATE public.roles SET submission_deadline=now() WHERE project_id=p_project_id;
 UPDATE public.projects SET casting_configuration=jsonb_set(coalesce(casting_configuration,'{}'::jsonb),'{submission_deadline_iso8601}',to_jsonb(now())) WHERE id=p_project_id;
END $$;
REVOKE ALL ON FUNCTION public.close_industry_casting_applications(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_industry_casting_applications(uuid) TO authenticated;
-- Only the trusted Edge Function may inspect another user's voice entitlement.
CREATE FUNCTION public.industry_voice_search_allowed(p_user_id uuid,p_industry boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN p_industry THEN public.effective_choreographer_plan_tier(p_user_id)='pro'
 WHEN EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_user_id
  AND lower(account_type) IN ('lookingfortalent','looking_for_talent','industry'))
 THEN public.effective_dancer_plan_tier(p_user_id)='pro' OR public.effective_choreographer_plan_tier(p_user_id)='pro' ELSE true END;
$$;
REVOKE ALL ON FUNCTION public.industry_voice_search_allowed(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.industry_voice_search_allowed(uuid,boolean) TO service_role;

-- Legacy contextual group-chat RPC uses the same bundled entitlement.
create or replace function public.start_project_group_conversation(
  p_project_id uuid,
  p_title text,
  p_member_user_ids uuid[],
  p_initial_message text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_body text := nullif(trim(coalesce(p_initial_message, '')), '');
  v_members uuid[];
  v_member uuid;
  v_conversation_id uuid;
  v_message_id uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in to message.';
  end if;

  if not public.is_project_operator(p_project_id, v_uid) then
    raise exception 'Only someone running this project can start a group.';
  end if;

  if public.effective_choreographer_plan_tier((select poster_id from public.projects where id=p_project_id)) <> 'pro' then
    raise exception 'Project groups, group schedules and contextual chats are included with Industry Pro.' using hint='industry_upgrade_required';
  end if;

  if v_title is null or char_length(v_title) > 80 then
    raise exception 'Give the group a name.';
  end if;

  if v_body is null then
    raise exception 'Message cannot be empty.';
  end if;

  select coalesce(array_agg(distinct member_id), '{}')
  into v_members
  from unnest(coalesce(p_member_user_ids, '{}'::uuid[])) as member_id
  where member_id is not null
    and member_id <> v_uid
    and public.user_is_on_project(p_project_id, member_id);

  if coalesce(array_length(v_members, 1), 0) < 2 then
    raise exception 'Choose at least two people on this project.';
  end if;

  insert into public.conversations (type, context_type, context_id, created_by, title, last_message_at)
  values ('event', 'project', p_project_id, v_uid, v_title, now())
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (v_conversation_id, v_uid, 'organizer');

  foreach v_member in array v_members loop
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation_id, v_member);
  end loop;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conversation_id, v_uid, v_body)
  returning id into v_message_id;

  perform public.notify_conversation_message(v_conversation_id, v_message_id, v_uid, v_body);

  return v_conversation_id;
end;
$$;

revoke all on function public.start_project_group_conversation(uuid, text, uuid[], text) from public, anon;
grant execute on function public.start_project_group_conversation(uuid, text, uuid[], text) to authenticated, service_role;


-- Web child castings bridge into the same project/role domain. Track their identities too,
-- so another client cannot evade the account quota by publishing through this table.
CREATE TABLE industry_private.child_publications (
 casting_id uuid PRIMARY KEY, project_id uuid NOT NULL,
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE industry_private.child_publications ENABLE ROW LEVEL SECURITY;
INSERT INTO industry_private.child_publications
 SELECT c.id,c.project_id,p.poster_id FROM public.castings c JOIN public.projects p ON p.id=c.project_id
 WHERE c.status<>'draft' AND coalesce(c.configuration->>'composer_draft','false')<>'true';
INSERT INTO industry_private.publications(project_id,owner_id)
 SELECT DISTINCT project_id,owner_id FROM industry_private.child_publications ON CONFLICT DO NOTHING;
CREATE FUNCTION industry_private.child_open(c public.castings) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT c.status='open' AND coalesce(c.configuration->>'composer_draft','false')<>'true'
 AND (c.submission_deadline IS NULL OR c.submission_deadline>now())
 AND (NOT EXISTS(SELECT 1 FROM public.roles r WHERE r.casting_id=c.id)
 OR EXISTS(SELECT 1 FROM public.roles r WHERE r.casting_id=c.id AND coalesce(r.is_active,true)
 AND NOT coalesce(r.is_casting_finalized,false) AND (r.submission_deadline IS NULL OR r.submission_deadline>now())));
$$;
CREATE FUNCTION industry_private.guard_child_casting() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid; first_publish boolean; was_open boolean:=false;
BEGIN
 IF TG_OP='UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN RAISE EXCEPTION 'Castings cannot be moved between projects.' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM industry_private.child_publications WHERE casting_id=NEW.id) THEN
  RAISE EXCEPTION 'A deleted published casting cannot reuse its ID, including as a draft.' USING ERRCODE='42501';
 END IF;
 IF NEW.status='draft' OR coalesce(NEW.configuration->>'composer_draft','false')='true' THEN RETURN NEW; END IF;
 SELECT poster_id INTO owner FROM public.projects WHERE id=NEW.project_id;
 PERFORM industry_private.lock_owner(owner);
 SELECT NOT EXISTS(SELECT 1 FROM industry_private.child_publications WHERE casting_id=NEW.id) INTO first_publish;
 IF TG_OP='INSERT' AND NOT first_publish THEN RAISE EXCEPTION 'A deleted published casting cannot reuse its ID.' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' THEN was_open:=industry_private.child_open(OLD); END IF;
 IF first_publish OR (industry_private.child_open(NEW) AND NOT was_open) THEN
  PERFORM industry_private.assert_publish(owner,NEW.project_id,first_publish);
  IF first_publish AND public.effective_choreographer_plan_tier(owner)<>'pro' AND EXISTS(
   SELECT 1 FROM public.roles r JOIN public.projects p ON p.id=r.project_id
   WHERE r.project_id=NEW.project_id AND r.casting_id IS NULL AND public.project_is_published_casting(p)
   AND coalesce(r.is_active,true) AND NOT coalesce(r.is_casting_finalized,false)
   AND (coalesce(r.submission_deadline,nullif(p.casting_configuration->>'submission_deadline_iso8601','')::timestamptz) IS NULL
     OR coalesce(r.submission_deadline,nullif(p.casting_configuration->>'submission_deadline_iso8601','')::timestamptz)>now())) THEN
   RAISE EXCEPTION 'Close applications on this project’s existing casting, or upgrade to Industry Pro.' USING HINT='industry_upgrade_required';
  END IF;
  IF public.effective_choreographer_plan_tier(owner)<>'pro' AND EXISTS(
   SELECT 1 FROM public.castings c JOIN public.projects p ON p.id=c.project_id
   WHERE p.poster_id=owner AND c.id<>NEW.id AND industry_private.child_open(c)) THEN
    RAISE EXCEPTION 'Free includes one casting accepting applications. Close applications or upgrade to Industry Pro.' USING HINT='industry_upgrade_required';
  END IF;
 END IF;
 IF first_publish THEN
  INSERT INTO industry_private.child_publications VALUES(NEW.id,NEW.project_id,owner);
  INSERT INTO industry_private.publications(project_id,owner_id,published_at) VALUES(NEW.project_id,owner,now())
   ON CONFLICT(project_id) DO UPDATE SET published_at=excluded.published_at;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER industry_child_publish BEFORE INSERT OR UPDATE ON public.castings FOR EACH ROW EXECUTE FUNCTION industry_private.guard_child_casting();
-- Setup remains a draft until this atomic publication succeeds. A rejected role/project update
-- rolls the publication and ledger back together; callers can retry the same saved draft.
CREATE FUNCTION public.publish_industry_child_casting(p_casting_id uuid,p_configuration jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.castings;
BEGIN
 SELECT * INTO c FROM public.castings WHERE id=p_casting_id FOR UPDATE;
 IF auth.uid() IS NULL OR c.id IS NULL OR NOT public.is_project_operator(c.project_id,auth.uid()) THEN
  RAISE EXCEPTION 'Only the project owner or an admin can publish.' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.roles WHERE casting_id=c.id) THEN RAISE EXCEPTION 'Add at least one role before publishing.'; END IF;
 IF p_configuration IS NULL OR jsonb_typeof(p_configuration)<>'object' THEN RAISE EXCEPTION 'Invalid casting configuration.'; END IF;
 p_configuration:=jsonb_set(p_configuration,'{composer_draft}','false');
 UPDATE public.castings SET status='open',configuration=p_configuration,
  submission_deadline=nullif(p_configuration->>'submission_deadline_iso8601','')::timestamptz WHERE id=c.id;
 UPDATE public.roles SET is_active=true WHERE casting_id=c.id;
 UPDATE public.projects SET is_active=true,casting_configuration=p_configuration || jsonb_build_object(
  'attachments',coalesce(casting_configuration->'attachments','[]'::jsonb)) WHERE id=c.project_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_industry_child_casting(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_industry_child_casting(uuid,jsonb) TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA industry_private FROM PUBLIC,anon,authenticated;

-- One whole-project conversation is Free; named/contextual subgroups remain Pro.
CREATE TABLE industry_private.main_conversations (
 project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
 conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE
);
ALTER TABLE industry_private.main_conversations ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION industry_private.sync_main_members(pid uuid,cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE members uuid[]; owner uuid;
BEGIN
 SELECT poster_id INTO owner FROM public.projects WHERE id=pid;
 SELECT array_agg(DISTINCT uid) INTO members FROM (
  SELECT owner AS uid UNION SELECT user_id FROM public.project_members WHERE project_id=pid
  UNION SELECT user_id FROM public.project_participants WHERE project_id=pid AND removed_at IS NULL
 ) m WHERE uid IS NOT NULL;
 DELETE FROM public.conversation_participants WHERE conversation_id=cid AND NOT(user_id=ANY(coalesce(members,'{}'::uuid[])));
 INSERT INTO public.conversation_participants(conversation_id,user_id,role)
 SELECT cid,uid,CASE WHEN uid=owner THEN 'organizer' ELSE 'attendee' END FROM unnest(members) uid
 ON CONFLICT(conversation_id,user_id) DO NOTHING;
END $$;
CREATE FUNCTION public.open_main_project_conversation(p_project_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid; owner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.user_is_on_project(p_project_id,auth.uid()) THEN
  RAISE EXCEPTION 'Only project participants can open this conversation.' USING ERRCODE='42501';
 END IF;
 SELECT poster_id INTO owner FROM public.projects WHERE id=p_project_id FOR UPDATE;
 SELECT conversation_id INTO cid FROM industry_private.main_conversations WHERE project_id=p_project_id;
 IF cid IS NULL THEN
  INSERT INTO public.conversations(type,context_type,context_id,created_by,title)
   VALUES('event','project',p_project_id,owner,'Project conversation') RETURNING id INTO cid;
  INSERT INTO industry_private.main_conversations VALUES(p_project_id,cid);
 END IF;
 PERFORM industry_private.sync_main_members(p_project_id,cid);
 RETURN cid;
END $$;
CREATE FUNCTION industry_private.refresh_main_members() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; cid uuid;
BEGIN
 pid:=CASE WHEN TG_OP='DELETE' THEN OLD.project_id ELSE NEW.project_id END;
 SELECT conversation_id INTO cid FROM industry_private.main_conversations WHERE project_id=pid;
 IF cid IS NOT NULL THEN PERFORM industry_private.sync_main_members(pid,cid); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER industry_main_team_members AFTER INSERT OR UPDATE OR DELETE ON public.project_members
 FOR EACH ROW EXECUTE FUNCTION industry_private.refresh_main_members();
CREATE TRIGGER industry_main_participants AFTER INSERT OR UPDATE OR DELETE ON public.project_participants
 FOR EACH ROW EXECUTE FUNCTION industry_private.refresh_main_members();
REVOKE ALL ON FUNCTION public.open_main_project_conversation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_main_project_conversation(uuid) TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA industry_private FROM PUBLIC,anon,authenticated;
