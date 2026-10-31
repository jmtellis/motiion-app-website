-- Capability links reveal roster membership only to someone holding the random token.
create table public.talent_list_public_links (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.talent_lists(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.talent_list_public_links enable row level security;
revoke all on public.talent_list_public_links from anon, authenticated;
grant select, insert, delete on public.talent_list_public_links to authenticated;
create policy "Roster owners manage external links" on public.talent_list_public_links
  for all to authenticated
  using (exists (select 1 from public.talent_lists l where l.id = list_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.talent_lists l where l.id = list_id and l.owner_id = (select auth.uid())));

-- Deliberate token-authorized public endpoint. No profile data, contact data, or
-- owner identity is returned. The web page resolves profiles through public RLS.
create function public.read_public_roster(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', l.name, 'expiresAt', s.expires_at,
    'profileIds', coalesce((select jsonb_agg(m.profile_id order by m.added_at, m.profile_id)
      from public.talent_list_members m where m.list_id = l.id), '[]'::jsonb))
  from public.talent_list_public_links s
  join public.talent_lists l on l.id = s.list_id
  where s.token = p_token and (s.expires_at is null or s.expires_at > now());
$$;
revoke all on function public.read_public_roster(uuid) from public;
grant execute on function public.read_public_roster(uuid) to anon, authenticated;
