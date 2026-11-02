-- A verified professional projection is not permission to expose a private
-- talent profile. Keep the existing verified/self SELECT policy, and constrain
-- it with canonical privacy/moderation state. Self editing remains available.
-- Existing security-definer casting/roster RPCs keep their explicit authorized
-- relationship checks; this changes only direct table reads, not those APIs.
create policy professional_profiles_respect_privacy
on public.professional_profiles
as restrictive for select to anon, authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.user_id = professional_profiles.user_id
      and coalesce(p.is_private, false) = false
      and coalesce(p.moderation_status, 'active') = 'active'
  )
);
