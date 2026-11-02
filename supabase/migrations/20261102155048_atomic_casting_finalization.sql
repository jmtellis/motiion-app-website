-- Website final selection is a single transaction. Additive and compatible with iOS:
-- existing role/submission/participant tables and commands remain unchanged.
create or replace function public.finalize_casting_role_selections(
  p_project_id uuid,
  p_role_id uuid,
  p_expected_submission_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.roles;
  v_selected uuid[];
  v_expected uuid[];
  v_talent_id uuid;
begin
  -- The dedicated command supports approved project admins as well as owners,
  -- while direct role writes remain protected by the existing owner-only RLS.
  -- Every ID is scoped to this checked project before reads or writes.
  if auth.uid() is null or not public.has_industry_approval(auth.uid())
      or not public.is_project_operator(p_project_id, auth.uid()) then
    raise exception 'Only an approved project owner or admin can finalize selections.' using errcode = '42501';
  end if;
  select * into v_role from public.roles
  where id = p_role_id and project_id = p_project_id for update;
  if not found then raise exception 'Role not found in this project.' using errcode = '42501'; end if;

  select coalesce(array_agg(distinct id order by id), '{}'::uuid[]) into v_expected
  from unnest(coalesce(p_expected_submission_ids, '{}'::uuid[])) id;
  if coalesce(v_role.is_casting_finalized, false) then
    select coalesce(array_agg(distinct id order by id), '{}'::uuid[]) into v_selected
    from unnest(coalesce(v_role.final_select_ids, '{}'::uuid[])) id;
    if v_expected is distinct from v_selected then
      raise exception 'Selections changed. Refresh before finalizing.' using errcode = 'PT409';
    end if;
    return jsonb_build_object('ok', true, 'finalized_count', cardinality(v_selected), 'already_finalized', true);
  end if;

  -- A concurrent pipeline edit must complete before computing the selection.
  perform 1 from public.casting_candidates c
  where c.project_id = p_project_id and p_role_id = any(c.role_ids) for update;
  perform 1 from public.submissions s where s.role_id = p_role_id for update;

  select coalesce(array_agg(s.id order by s.id), '{}'::uuid[]) into v_selected
  from public.submissions s
  where s.role_id = p_role_id and s.status = 'approved' and (
    exists (
      select 1 from public.casting_candidates c
      where c.project_id = p_project_id and c.submission_id = s.id
        and p_role_id = any(c.role_ids)
        and c.status in ('selected', 'availability_requested', 'offer_sent', 'accepted', 'confirmed')
    ) or (
      s.id = any(coalesce(v_role.final_select_ids, '{}'::uuid[]))
      and not exists (
        select 1 from public.casting_candidates c
        where c.project_id = p_project_id and c.submission_id = s.id and p_role_id = any(c.role_ids)
      )
    )
  );
  if cardinality(v_selected) = 0 then
    raise exception 'Select at least one submitted candidate before finalizing.' using errcode = '22023';
  end if;
  if v_expected is distinct from v_selected then
    raise exception 'Selections changed. Refresh before finalizing.' using errcode = 'PT409';
  end if;

  -- Any membership failure rolls back the whole operation, including prior additions.
  for v_talent_id in
    select distinct s.talent_id from public.submissions s
    where s.id = any(v_selected) and s.talent_id is not null
  loop
    perform public.add_project_participant(p_project_id, v_talent_id);
  end loop;

  update public.roles set final_select_ids = v_selected, is_casting_finalized = true,
    is_review_complete = true, is_active = false, updated_at = now()
  where id = p_role_id and project_id = p_project_id;
  if not found then raise exception 'Role could not be updated.' using errcode = '42501'; end if;

  return jsonb_build_object('ok', true, 'finalized_count', cardinality(v_selected), 'already_finalized', false);
end;
$$;
revoke all on function public.finalize_casting_role_selections(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.finalize_casting_role_selections(uuid, uuid, uuid[]) to authenticated;
comment on function public.finalize_casting_role_selections(uuid, uuid, uuid[]) is
  'Atomically finalize explicit selections and add project participants; requires current approved owner/admin access.';
