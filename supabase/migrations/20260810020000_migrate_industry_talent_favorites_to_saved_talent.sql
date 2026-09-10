-- Backfill industry talent_favorites into Roster Saved Talent (talent_lists kind=favorites).
-- Also tighten talent_list_members RLS so INSERT WITH CHECK is explicit.

insert into public.talent_lists (owner_id, name, kind)
select distinct tf.talent_id, 'Saved Talent', 'favorites'
from public.talent_favorites tf
join public.profiles p on p.user_id = tf.talent_id
where lower(coalesce(p.account_type, '')) in ('lookingfortalent', 'looking_for_talent')
  and not exists (
    select 1 from public.talent_lists tl
    where tl.owner_id = tf.talent_id and tl.kind = 'favorites'
  );

with industry_favs as (
  select tf.talent_id as owner_id, tf.favorited_talent_id as talent_user_id
  from public.talent_favorites tf
  join public.profiles p on p.user_id = tf.talent_id
  where lower(coalesce(p.account_type, '')) in ('lookingfortalent', 'looking_for_talent')
),
resolved as (
  select
    f.owner_id,
    f.talent_user_id,
    public.resolve_professional_profile_id(f.talent_user_id::text) as profile_id
  from industry_favs f
)
insert into public.talent_list_members (list_id, profile_id)
select tl.id, r.profile_id
from resolved r
join public.talent_lists tl
  on tl.owner_id = r.owner_id and tl.kind = 'favorites'
where r.profile_id is not null
on conflict (list_id, profile_id) do nothing;

drop policy if exists "talent_list_members_owner" on public.talent_list_members;
create policy "talent_list_members_owner"
  on public.talent_list_members
  for all
  to authenticated
  using (
    exists (
      select 1 from public.talent_lists tl
      where tl.id = talent_list_members.list_id
        and tl.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.talent_lists tl
      where tl.id = talent_list_members.list_id
        and tl.owner_id = auth.uid()
    )
  );
