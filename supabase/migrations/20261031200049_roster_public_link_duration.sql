create or replace function public.read_public_roster(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', l.name, 'expiresAt', s.expires_at, 'createdAt', s.created_at,
    'sharedBy', (select jsonb_build_object(
      'name', coalesce(nullif(p.display_name, ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Your collaborator'),
      'avatarUrl', coalesce(p.industry_avatar_url, p.headshot_urls ->> 0))
      from public.profiles p where p.user_id = l.owner_id),
    'profileIds', coalesce((select jsonb_agg(coalesce(p.user_id, m.profile_id) order by m.added_at, m.profile_id)
      from public.talent_list_members m left join public.professional_profiles p on p.id = m.profile_id where m.list_id = l.id), '[]'::jsonb))
  from public.talent_list_public_links s
  join public.talent_lists l on l.id = s.list_id
  where s.token = p_token and (s.expires_at is null or s.expires_at > now());
$$;
revoke all on function public.read_public_roster(uuid) from public;
grant execute on function public.read_public_roster(uuid) to anon, authenticated;
