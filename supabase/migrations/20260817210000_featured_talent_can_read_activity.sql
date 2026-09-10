-- Accepted featured talent can read the event they appear on (including private events),
-- so it can show in their attending list. They do not gain organizer update rights.

create or replace function public.user_is_accepted_featured_talent_on_activity(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.activity_featured_talent aft
    where aft.activity_id = p_activity_id
      and aft.talent_user_id = (select auth.uid())
      and aft.status = 'accepted'
  );
$$;

revoke all on function public.user_is_accepted_featured_talent_on_activity(uuid) from public;
grant execute on function public.user_is_accepted_featured_talent_on_activity(uuid) to authenticated;
grant execute on function public.user_is_accepted_featured_talent_on_activity(uuid) to service_role;

drop policy if exists "Featured talent can read activities they appear on" on public.activities;
create policy "Featured talent can read activities they appear on"
  on public.activities
  for select
  to authenticated
  using (public.user_is_accepted_featured_talent_on_activity(id));
