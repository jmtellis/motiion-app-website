-- Admin access is an explicit owner action in Settings, never a side effect of joining People.
CREATE OR REPLACE FUNCTION public.add_project_admin(p_project_id uuid,p_invitee_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT poster_id INTO owner_id FROM public.projects WHERE id=p_project_id;
  IF auth.uid() IS NULL OR owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the project owner can add admins.' USING ERRCODE='42501';
  END IF;
  IF p_invitee_user_id IS NULL OR p_invitee_user_id=owner_id
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_invitee_user_id) THEN
    RAISE EXCEPTION 'Choose another Motiion account.' USING ERRCODE='22023';
  END IF;
  PERFORM set_config('motiion.admin_invite','on',true);
  INSERT INTO public.project_members(project_id,user_id,role) VALUES(p_project_id,p_invitee_user_id,'admin')
  ON CONFLICT(project_id,user_id) DO UPDATE SET role='admin';
END;
$$;
REVOKE ALL ON FUNCTION public.add_project_admin(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_project_admin(uuid,uuid) TO authenticated;

-- Operators can edit working content, but cannot transfer ownership or move roles between projects.
CREATE OR REPLACE FUNCTION public.guard_project_operator_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.poster_id IS DISTINCT FROM auth.uid() THEN
    IF NEW.poster_id IS DISTINCT FROM OLD.poster_id OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Only the owner can change ownership.' USING ERRCODE='42501';
    END IF;
    IF TG_TABLE_NAME='roles' AND (to_jsonb(NEW)->>'project_id') IS DISTINCT FROM (to_jsonb(OLD)->>'project_id') THEN
      RAISE EXCEPTION 'Admins cannot move roles between projects.' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_project_operator_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER project_operator_identity BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.guard_project_operator_identity();
CREATE TRIGGER role_operator_identity BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.guard_project_operator_identity();
CREATE POLICY project_operator_select ON public.projects FOR SELECT TO authenticated USING(public.is_project_operator(id,(SELECT auth.uid())));
CREATE POLICY project_operator_update ON public.projects FOR UPDATE TO authenticated USING(public.is_project_operator(id,(SELECT auth.uid()))) WITH CHECK(public.is_project_operator(id,(SELECT auth.uid())));
CREATE POLICY role_operator_select ON public.roles FOR SELECT TO authenticated USING(public.is_project_operator(project_id,(SELECT auth.uid())));
CREATE POLICY role_operator_update ON public.roles FOR UPDATE TO authenticated USING(public.is_project_operator(project_id,(SELECT auth.uid()))) WITH CHECK(public.is_project_operator(project_id,(SELECT auth.uid())));
CREATE POLICY role_operator_insert ON public.roles FOR INSERT TO authenticated WITH CHECK(public.is_project_operator(project_id,(SELECT auth.uid())) AND poster_id=(SELECT auth.uid()));
CREATE POLICY role_operator_delete ON public.roles FOR DELETE TO authenticated USING(public.is_project_operator(project_id,(SELECT auth.uid())));
CREATE OR REPLACE FUNCTION public.create_activity_featured_talent_invite(p_activity_id uuid, p_display_name text, p_parent_id uuid DEFAULT NULL::uuid, p_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_can_invite boolean := false;
  v_parent record;
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_token text;
  v_id uuid;
  v_attempts int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_name is null then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  if not exists (
    select 1 from public.activities a
    where a.id = p_activity_id and a.type = 'event'
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if public.is_activity_manager(p_activity_id) then
    v_can_invite := true;
  elsif p_parent_id is not null then
    select * into v_parent
    from public.activity_featured_talent
    where id = p_parent_id
      and activity_id = p_activity_id
      and parent_id is null
      and status = 'accepted'
      and (talent_user_id = v_uid OR EXISTS(SELECT 1 FROM public.featured_talent_workspaces w WHERE w.featured_talent_id=p_parent_id AND w.ended_at IS NULL AND public.is_project_operator(w.project_id,v_uid)));
    if found then
      v_can_invite := true;
    end if;
  end if;

  if not v_can_invite then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_parent_id is not null then
    select * into v_parent
    from public.activity_featured_talent
    where id = p_parent_id and activity_id = p_activity_id;
    if not found or v_parent.parent_id is not null then
      return jsonb_build_object('ok', false, 'error', 'invalid_parent');
    end if;
    if v_parent.status is distinct from 'accepted' then
      return jsonb_build_object('ok', false, 'error', 'parent_not_accepted');
    end if;
  end if;

  if exists (
    select 1 from public.activity_featured_talent_invites
    where activity_id = p_activity_id
      and status = 'pending'
      and lower(trim(display_name)) = lower(v_name)
      and parent_id is not distinct from p_parent_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_invited');
  end if;

  loop
    v_token := public.generate_featured_talent_invite_token_value();
    begin
      insert into public.activity_featured_talent_invites (
        activity_id, parent_id, display_name, email, token, invited_by_user_id, status
      ) values (
        p_activity_id, p_parent_id, v_name, v_email, v_token, v_uid, 'pending'
      )
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 5 then
        return jsonb_build_object('ok', false, 'error', 'token_collision');
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'token', v_token,
    'url', 'https://www.motiion.app/featured-invite/' || v_token,
    'display_name', v_name,
    'parent_id', p_parent_id,
    'status', 'pending'
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_casting_swipe_invite(p_role_id uuid, p_talent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role public.roles%rowtype;
  v_cfg jsonb := '{}'::jsonb;
  v_deadline timestamptz;
  v_limit int;
  v_existing int;
  v_row public.role_access%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_role_id is null or p_talent_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  select *
    into v_role
  from public.roles r
  where r.id = p_role_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'role_not_found');
  end if;

  if v_role.poster_id is distinct from v_uid and not public.is_project_operator(v_role.project_id,v_uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_deadline := v_role.submission_deadline;

  select coalesce(p.casting_configuration, '{}'::jsonb)
    into v_cfg
  from public.projects p
  where p.id = v_role.project_id;

  if v_deadline is null
     and nullif(trim(coalesce(v_cfg ->> 'submission_deadline_iso8601', '')), '') is not null then
    begin
      v_deadline := (v_cfg ->> 'submission_deadline_iso8601')::timestamptz;
    exception
      when others then
        v_deadline := null;
    end;
  end if;

  if coalesce(v_role.is_active, false) is not true
     or coalesce(v_role.is_casting_finalized, false)
     or (v_deadline is not null and v_deadline < timezone('utc', now())) then
    return jsonb_build_object('ok', false, 'error', 'casting_closed');
  end if;

  if (v_cfg ->> 'submission_limit') is not null then
    begin
      v_limit := (v_cfg ->> 'submission_limit')::int;
    exception
      when others then
        v_limit := null;
    end;

    if v_limit is not null and v_limit > 0 then
      select count(*)
        into v_existing
      from public.submissions s
      where s.role_id = p_role_id;

      if v_existing >= v_limit then
        return jsonb_build_object('ok', false, 'error', 'casting_closed');
      end if;
    end if;
  end if;

  insert into public.role_access (role_id, talent_id, status)
  values (p_role_id, p_talent_id, 'pending')
  on conflict (role_id, talent_id) do update set
    status = case
      when role_access.status = 'accepted'::text then role_access.status
      else excluded.status
    end,
    granted_at = case
      when role_access.status = 'accepted'::text then role_access.granted_at
      else excluded.granted_at
    end
  returning role_access.* into v_row;

  return jsonb_build_object(
    'ok', true,
    'role_access_id', v_row.id,
    'status', v_row.status
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.resend_casting_invite(p_role_id uuid, p_talent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r public.roles; invitation public.role_access; result jsonb; notification_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  SELECT * INTO r FROM public.roles WHERE id=p_role_id;
  IF r.id IS NULL OR (r.poster_id IS DISTINCT FROM auth.uid() AND NOT public.is_project_operator(r.project_id,auth.uid())) THEN
    RETURN jsonb_build_object('ok',false,'error','forbidden');
  END IF;
  SELECT * INTO invitation FROM public.role_access
    WHERE role_id=p_role_id AND talent_id=p_talent_id FOR UPDATE;
  IF invitation.id IS NULL OR invitation.status IS DISTINCT FROM 'pending'
     OR EXISTS(SELECT 1 FROM public.submissions WHERE role_id=p_role_id AND talent_id=p_talent_id) THEN
    RETURN jsonb_build_object('ok',false,'error','not_pending');
  END IF;
  IF invitation.granted_at > now() - interval '1 minute' THEN
    RETURN jsonb_build_object('ok',false,'error','too_soon');
  END IF;
  -- Reuse the role deadline, finalized-state and submission-cap checks.
  result := public.create_casting_swipe_invite(p_role_id,p_talent_id);
  IF NOT coalesce((result->>'ok')::boolean,false) THEN RETURN result; END IF;
  notification_id := public.create_notification(
    p_talent_id,'casting_update','Submission request reminder',
    coalesce(public._notif_profile_display_name(r.poster_id),'Someone') || ' is reminding you to submit for ' || coalesce(nullif(r.title,''),'this role') || '.',
    jsonb_build_object('role_id',p_role_id::text,'casting_invite_pending','true'),
    'casting_invite_resend|' || invitation.id::text || '|' || now()::text
  );
  IF notification_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','notification_unavailable');
  END IF;
  RETURN jsonb_build_object('ok',true,'status','pending','role_access_id',invitation.id);
END;
$function$
;
