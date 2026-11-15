-- Paid capacity applies to private drafts as well as published projects.
create or replace function project_billing.is_active(p public.projects) returns boolean
language sql stable set search_path='' as $$
  select coalesce(p.is_active,true);
$$;
create or replace function project_billing.guard_project() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.poster_id is distinct from old.poster_id then
    raise exception 'Project ownership cannot change';
  end if;
  -- Even an insert marked archived must have purchased capacity.
  if tg_op='INSERT' or project_billing.is_active(new) then
    perform project_billing.assert_capacity(new.poster_id,new.id);
  end if;
  return new;
end;
$$;
revoke all on function project_billing.is_active(public.projects) from public,anon,authenticated;
revoke all on function project_billing.guard_project() from public,anon,authenticated;
