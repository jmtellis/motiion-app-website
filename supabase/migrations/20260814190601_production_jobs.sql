-- Lightweight production jobs: people-and-credit containers on public.jobs.
-- Adds job_kind, role/status on job_members, join tokens, pending invites,
-- linked activities, resume credits, job inbox channel, and RPCs.

-- ---------------------------------------------------------------------------
-- jobs.job_kind
-- ---------------------------------------------------------------------------

alter table public.jobs
  add column if not exists job_kind text;

alter table public.jobs
  drop constraint if exists jobs_job_kind_check;

alter table public.jobs
  add constraint jobs_job_kind_check
  check (
    job_kind is null
    or job_kind in ('production', 'showcase', 'showcase_sub', 'casting_booking')
  );

update public.jobs
set job_kind = 'showcase'
where coalesce(job_type, '') = 'showcase'
  and job_kind is distinct from 'showcase';

update public.jobs
set job_kind = 'showcase_sub'
where coalesce(job_type, '') = 'showcase_sub'
  and job_kind is distinct from 'showcase_sub';

update public.jobs
set job_kind = 'casting_booking'
where project_id is not null
  and coalesce(job_type, '') not in ('showcase', 'showcase_sub')
  and job_kind is null;

create index if not exists idx_jobs_poster_kind_status
  on public.jobs (poster_id, job_kind, status);

comment on column public.jobs.job_kind is
  'Discriminator: production (lightweight Job), showcase/showcase_sub, casting_booking. Separate from free-text job_type.';

-- ---------------------------------------------------------------------------
-- job_members: roles, expanded status/source
-- ---------------------------------------------------------------------------

alter table public.job_members
  add column if not exists member_role text;

alter table public.job_members
  drop constraint if exists job_members_member_role_check;

alter table public.job_members
  add constraint job_members_member_role_check
  check (
    member_role is null
    or member_role in ('choreographer', 'assistant', 'dancer')
  );

alter table public.job_members
  drop constraint if exists job_members_status_check;

alter table public.job_members
  add constraint job_members_status_check
  check (status in ('pending', 'active', 'declined', 'removed'));

alter table public.job_members
  drop constraint if exists job_members_source_check;

alter table public.job_members
  add constraint job_members_source_check
  check (
    source is null
    or source in (
      'casting_final_select',
      'direct_invite',
      'manual',
      'roster_copy',
      'join_link'
    )
  );

create index if not exists idx_job_members_job_user_status
  on public.job_members (job_id, user_id, status);

-- ---------------------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------------------

create table if not exists public.job_join_tokens (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_join_tokens_job_id on public.job_join_tokens(job_id);
create index if not exists idx_job_join_tokens_token on public.job_join_tokens(token);

create table if not exists public.job_pending_invites (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  role text not null check (role in ('choreographer', 'assistant', 'dancer')),
  invited_user_id uuid references public.profiles(user_id) on delete cascade,
  professional_profile_id uuid,
  email text,
  phone text,
  token_id uuid references public.job_join_tokens(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  invited_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_job_pending_invites_job_status
  on public.job_pending_invites (job_id, status);
create index if not exists idx_job_pending_invites_user
  on public.job_pending_invites (invited_user_id)
  where invited_user_id is not null;

create table if not exists public.job_linked_activities (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  purpose text not null default 'other'
    check (purpose in ('rehearsal', 'class', 'casting', 'show', 'other')),
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (activity_id is not null and project_id is null)
    or (activity_id is null and project_id is not null)
  ),
  unique (job_id, activity_id),
  unique (job_id, project_id)
);

create index if not exists idx_job_linked_activities_job on public.job_linked_activities(job_id);
create index if not exists idx_job_linked_activities_activity
  on public.job_linked_activities(activity_id)
  where activity_id is not null;

create table if not exists public.job_resume_credits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'edited', 'hidden')),
  experience_entry_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, user_id)
);

create index if not exists idx_job_resume_credits_user
  on public.job_resume_credits (user_id, status);

create table if not exists public.job_inbox_channels (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id),
  unique (conversation_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.job_join_tokens enable row level security;
alter table public.job_pending_invites enable row level security;
alter table public.job_linked_activities enable row level security;
alter table public.job_resume_credits enable row level security;
alter table public.job_inbox_channels enable row level security;

drop policy if exists "Organizers manage job join tokens" on public.job_join_tokens;
create policy "Organizers manage job join tokens"
  on public.job_join_tokens
  for all
  to authenticated
  using (
    public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  )
  with check (
    created_by = auth.uid()
    and (
      public.is_job_organizer(job_id, auth.uid())
      or public.is_job_admin(auth.uid())
    )
  );

drop policy if exists "Participants read job pending invites" on public.job_pending_invites;
create policy "Participants read job pending invites"
  on public.job_pending_invites
  for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  );

drop policy if exists "Organizers manage job pending invites" on public.job_pending_invites;
create policy "Organizers manage job pending invites"
  on public.job_pending_invites
  for all
  to authenticated
  using (
    public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  )
  with check (
    public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  );

drop policy if exists "Invitee update own pending invite" on public.job_pending_invites;
create policy "Invitee update own pending invite"
  on public.job_pending_invites
  for update
  to authenticated
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

drop policy if exists "Access job linked activities" on public.job_linked_activities;
create policy "Access job linked activities"
  on public.job_linked_activities
  for select
  to authenticated
  using (
    public.can_access_job(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  );

drop policy if exists "Organizers manage job linked activities" on public.job_linked_activities;
create policy "Organizers manage job linked activities"
  on public.job_linked_activities
  for all
  to authenticated
  using (
    public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  )
  with check (
    public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  );

drop policy if exists "Users read own job resume credits" on public.job_resume_credits;
create policy "Users read own job resume credits"
  on public.job_resume_credits
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_job_organizer(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
  );

drop policy if exists "Users update own job resume credits" on public.job_resume_credits;
create policy "Users update own job resume credits"
  on public.job_resume_credits
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Access job inbox channels" on public.job_inbox_channels;
create policy "Access job inbox channels"
  on public.job_inbox_channels
  for select
  to authenticated
  using (
    public.can_access_job(job_id, auth.uid())
    or public.is_job_admin(auth.uid())
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = job_inbox_channels.conversation_id
        and cp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_user_create_production_jobs(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_user_create_jobs(p_user_id)
    or exists (
      select 1
      from public.non_talent_profiles ntp
      where ntp.id = p_user_id
        and ntp.role in (
          'choreographer',
          'casting_professional',
          'creative_director_or_producer',
          'talent_representative',
          'brand_or_agency_professional',
          'other',
          'casting_director',
          'creative_director',
          'producer',
          'talent_agency',
          'studio_owner',
          'dance_company',
          'brand',
          'production_company',
          'event_organizer'
        )
    );
$$;

revoke all on function public.can_user_create_production_jobs(uuid) from public;
grant execute on function public.can_user_create_production_jobs(uuid) to authenticated;

create or replace function public.is_production_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id and j.job_kind = 'production'
  );
$$;

revoke all on function public.is_production_job(uuid) from public;
grant execute on function public.is_production_job(uuid) to authenticated;

create or replace function public.generate_job_join_token_value()
returns text
language plpgsql
volatile
as $$
declare
  v_token text;
begin
  v_token := encode(gen_random_bytes(18), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
  v_token := lower(substr(v_token, 1, 22));
  return v_token;
end;
$$;

create or replace function public.job_inbox_roster_user_ids(p_job_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct uid), array[]::uuid[])
  from (
    select j.poster_id as uid
    from public.jobs j
    where j.id = p_job_id
    union
    select jo.user_id
    from public.job_organizers jo
    where jo.job_id = p_job_id
    union
    select jm.user_id
    from public.job_members jm
    where jm.job_id = p_job_id
      and jm.status = 'active'
  ) s(uid);
$$;

revoke all on function public.job_inbox_roster_user_ids(uuid) from public;
grant execute on function public.job_inbox_roster_user_ids(uuid) to authenticated;

create or replace function public.sync_job_inbox_channel_members(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv uuid;
  r uuid;
begin
  select conversation_id into v_conv
  from public.job_inbox_channels
  where job_id = p_job_id
  limit 1;

  if v_conv is null then
    return;
  end if;

  foreach r in array public.job_inbox_roster_user_ids(p_job_id)
  loop
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (v_conv, r, public.messaging_user_role(r))
    on conflict (conversation_id, user_id) do nothing;
  end loop;

  delete from public.conversation_participants cp
  where cp.conversation_id = v_conv
    and not (cp.user_id = any (public.job_inbox_roster_user_ids(p_job_id)));
end;
$$;

revoke all on function public.sync_job_inbox_channel_members(uuid) from public;
grant execute on function public.sync_job_inbox_channel_members(uuid) to authenticated;

create or replace function public.ensure_job_inbox_channel(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_conv uuid;
  v_existing boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_job from public.jobs where id = p_job_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'job_not_found');
  end if;

  if coalesce(v_job.job_kind, '') is distinct from 'production' then
    return jsonb_build_object('ok', false, 'error', 'not_production_job');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_member(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select conversation_id into v_conv
  from public.job_inbox_channels
  where job_id = p_job_id
  limit 1;

  if v_conv is not null then
    v_existing := true;
  else
    insert into public.conversations (type, context_type, context_id, created_by, title)
    values (
      'job',
      'job',
      p_job_id,
      v_uid,
      coalesce(nullif(trim(both from v_job.title), ''), 'Job')
    )
    returning id into v_conv;

    insert into public.job_inbox_channels (job_id, conversation_id, created_by)
    values (p_job_id, v_conv, v_uid);
  end if;

  perform public.sync_job_inbox_channel_members(p_job_id);

  return jsonb_build_object(
    'ok', true,
    'conversation_id', v_conv,
    'existing', v_existing
  );
end;
$$;

revoke all on function public.ensure_job_inbox_channel(uuid) from public;
grant execute on function public.ensure_job_inbox_channel(uuid) to authenticated;

create or replace function public.enroll_job_member_in_linked_activities(
  p_job_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select jla.activity_id, a.activity_date
    from public.job_linked_activities jla
    join public.activities a on a.id = jla.activity_id
    where jla.job_id = p_job_id
      and jla.activity_id is not null
      and jla.purpose in ('rehearsal', 'class', 'show')
      and coalesce(a.status, 'active') <> 'cancelled'
      and (
        a.activity_date is null
        or a.activity_date >= current_date
      )
  loop
    insert into public.enrollments (activity_id, student_id, status)
    values (r.activity_id, p_user_id, 'guest')
    on conflict (activity_id, student_id) do update
    set status = case
      when public.enrollments.status = 'paid' then public.enrollments.status
      when public.enrollments.status = 'comped' then public.enrollments.status
      else 'guest'
    end,
    updated_at = now();
  end loop;
end;
$$;

create or replace function public.enroll_accepted_dancers_on_activity(
  p_job_id uuid,
  p_activity_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select jm.user_id
    from public.job_members jm
    where jm.job_id = p_job_id
      and jm.status = 'active'
      and coalesce(jm.member_role, 'dancer') = 'dancer'
  loop
    insert into public.enrollments (activity_id, student_id, status)
    values (p_activity_id, r.user_id, 'guest')
    on conflict (activity_id, student_id) do update
    set status = case
      when public.enrollments.status = 'paid' then public.enrollments.status
      when public.enrollments.status = 'comped' then public.enrollments.status
      else 'guest'
    end,
    updated_at = now();
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roster attach (snapshot)
-- ---------------------------------------------------------------------------

create or replace function public.attach_roster_to_job(
  p_job_id uuid,
  p_talent_list_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_added_members int := 0;
  v_added_pending int := 0;
  r record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_production_job(p_job_id) then
    return jsonb_build_object('ok', false, 'error', 'not_production_job');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if not exists (
    select 1 from public.talent_lists tl
    where tl.id = p_talent_list_id and tl.owner_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'roster_not_found');
  end if;

  for r in
    select
      tlm.profile_id,
      pp.user_id
    from public.talent_list_members tlm
    left join public.professional_profiles pp on pp.id = tlm.profile_id
    where tlm.list_id = p_talent_list_id
  loop
    if r.user_id is not null then
      if r.user_id = v_uid then
        continue;
      end if;
      if not exists (
        select 1 from public.job_members
        where job_id = p_job_id and user_id = r.user_id
      ) then
        insert into public.job_members (
          job_id, user_id, status, source, invited_by, member_role
        )
        values (
          p_job_id, r.user_id, 'pending', 'roster_copy', v_uid, 'dancer'
        );
        v_added_members := v_added_members + 1;
      end if;
    elsif r.profile_id is not null then
      if not exists (
        select 1 from public.job_pending_invites
        where job_id = p_job_id
          and professional_profile_id = r.profile_id
          and status = 'pending'
      ) then
        insert into public.job_pending_invites (
          job_id, role, professional_profile_id, invited_by, status
        )
        values (
          p_job_id, 'dancer', r.profile_id, v_uid, 'pending'
        );
        v_added_pending := v_added_pending + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'members_pending', v_added_members,
    'invites_pending', v_added_pending
  );
end;
$$;

revoke all on function public.attach_roster_to_job(uuid, uuid) from public;
grant execute on function public.attach_roster_to_job(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Join tokens
-- ---------------------------------------------------------------------------

create or replace function public.create_job_join_token(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_production_job(p_job_id) then
    return jsonb_build_object('ok', false, 'error', 'not_production_job');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Prefer an existing active token
  select id, token into v_id, v_token
  from public.job_join_tokens
  where job_id = p_job_id
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if v_token is null then
    v_token := public.generate_job_join_token_value();
    insert into public.job_join_tokens (job_id, token, created_by)
    values (p_job_id, v_token, v_uid)
    returning id into v_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'token_id', v_id,
    'token', v_token,
    'url', 'https://www.motiion.app/job/' || v_token
  );
end;
$$;

revoke all on function public.create_job_join_token(uuid) from public;
grant execute on function public.create_job_join_token(uuid) to authenticated;

create or replace function public.revoke_job_join_token(p_token_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select job_id into v_job from public.job_join_tokens where id = p_token_id;
  if v_job is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not (
    public.is_job_organizer(v_job, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.job_join_tokens
  set revoked_at = now()
  where id = p_token_id and revoked_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.revoke_job_join_token(uuid) from public;
grant execute on function public.revoke_job_join_token(uuid) to authenticated;

create or replace function public.get_production_job_join_card(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_tok public.job_join_tokens%rowtype;
  v_job public.jobs%rowtype;
  v_chor_name text;
  v_poster_name text;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_tok
  from public.job_join_tokens
  where token = trim(p_token)
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_tok.revoked_at is not null
     or (v_tok.expires_at is not null and v_tok.expires_at <= now()) then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_job from public.jobs where id = v_tok.job_id;
  if not found or coalesce(v_job.job_kind, '') is distinct from 'production' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(
    nullif(trim(both from p.display_name), ''),
    nullif(trim(both from p.first_name || ' ' || coalesce(p.last_name, '')), ''),
    'Choreographer'
  )
  into v_chor_name
  from public.job_members jm
  join public.profiles p on p.user_id = jm.user_id
  where jm.job_id = v_job.id
    and jm.member_role = 'choreographer'
    and jm.status in ('active', 'pending')
  order by case when jm.status = 'active' then 0 else 1 end, jm.created_at
  limit 1;

  select coalesce(
    nullif(trim(both from p.display_name), ''),
    nullif(trim(both from p.first_name || ' ' || coalesce(p.last_name, '')), ''),
    'Host'
  )
  into v_poster_name
  from public.profiles p
  where p.user_id = v_job.poster_id;

  return jsonb_build_object(
    'ok', true,
    'job_id', v_job.id,
    'title', v_job.title,
    'start_date', v_job.start_date,
    'end_date', v_job.end_date,
    'cover_image_url', v_job.cover_image_url,
    'choreographer_name', v_chor_name,
    'inviter_name', v_poster_name,
    'poster_id', v_job.poster_id,
    'token', v_tok.token
  );
end;
$$;

revoke all on function public.get_production_job_join_card(text) from public;
grant execute on function public.get_production_job_join_card(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create production job
-- ---------------------------------------------------------------------------

create or replace function public.create_production_job(
  p_title text,
  p_start_date date,
  p_end_date date,
  p_choreographer_ids uuid[] default '{}',
  p_assistant_ids uuid[] default '{}',
  p_talent_list_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job_id uuid;
  v_token_result jsonb;
  v_inbox jsonb;
  v_roster jsonb;
  cid uuid;
  aid uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.can_user_create_production_jobs(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_title is null or trim(p_title) = '' then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;

  insert into public.jobs (
    poster_id,
    title,
    job_kind,
    start_date,
    end_date,
    status,
    is_private,
    final_select_ids
  )
  values (
    v_uid,
    trim(p_title),
    'production',
    p_start_date,
    p_end_date,
    'upcoming',
    true,
    '{}'
  )
  returning id into v_job_id;

  insert into public.job_organizers (job_id, user_id, added_by)
  values (v_job_id, v_uid, v_uid)
  on conflict (job_id, user_id) do nothing;

  -- Choreographers
  if p_choreographer_ids is null or cardinality(p_choreographer_ids) = 0 then
    insert into public.job_members (
      job_id, user_id, status, source, invited_by, member_role
    )
    values (
      v_job_id, v_uid, 'active', 'manual', v_uid, 'choreographer'
    )
    on conflict (job_id, user_id) do update
    set member_role = 'choreographer',
        status = 'active',
        updated_at = now();
  else
    foreach cid in array p_choreographer_ids
    loop
      insert into public.job_members (
        job_id, user_id, status, source, invited_by, member_role
      )
      values (
        v_job_id,
        cid,
        case when cid = v_uid then 'active' else 'pending' end,
        'direct_invite',
        v_uid,
        'choreographer'
      )
      on conflict (job_id, user_id) do update
      set member_role = 'choreographer',
          status = case
            when excluded.user_id = v_uid then 'active'
            when public.job_members.status = 'active' then 'active'
            else 'pending'
          end,
          updated_at = now();
    end loop;
  end if;

  if p_assistant_ids is not null then
    foreach aid in array p_assistant_ids
    loop
      insert into public.job_members (
        job_id, user_id, status, source, invited_by, member_role
      )
      values (
        v_job_id,
        aid,
        case when aid = v_uid then 'active' else 'pending' end,
        'direct_invite',
        v_uid,
        'assistant'
      )
      on conflict (job_id, user_id) do nothing;
    end loop;
  end if;

  if p_talent_list_id is not null then
    v_roster := public.attach_roster_to_job(p_job_id := v_job_id, p_talent_list_id := p_talent_list_id);
  end if;

  v_token_result := public.create_job_join_token(v_job_id);
  v_inbox := public.ensure_job_inbox_channel(v_job_id);

  return jsonb_build_object(
    'ok', true,
    'job_id', v_job_id,
    'token', v_token_result ->> 'token',
    'url', v_token_result ->> 'url',
    'conversation_id', v_inbox -> 'conversation_id',
    'roster', v_roster
  );
end;
$$;

revoke all on function public.create_production_job(text, date, date, uuid[], uuid[], uuid) from public;
grant execute on function public.create_production_job(text, date, date, uuid[], uuid[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Accept / decline invite
-- ---------------------------------------------------------------------------

create or replace function public.activate_production_job_member(
  p_job_id uuid,
  p_user_id uuid,
  p_role text default 'dancer',
  p_source text default 'join_link'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.job_members (
    job_id, user_id, status, source, invited_by, member_role
  )
  values (
    p_job_id,
    p_user_id,
    'active',
    p_source,
    null,
    coalesce(nullif(p_role, ''), 'dancer')
  )
  on conflict (job_id, user_id) do update
  set status = 'active',
      member_role = coalesce(public.job_members.member_role, excluded.member_role),
      updated_at = now();

  update public.job_pending_invites
  set status = 'accepted', responded_at = now()
  where job_id = p_job_id
    and invited_user_id = p_user_id
    and status = 'pending';

  perform public.ensure_job_inbox_channel(p_job_id);
  perform public.sync_job_inbox_channel_members(p_job_id);
  perform public.enroll_job_member_in_linked_activities(p_job_id, p_user_id);

  return jsonb_build_object('ok', true, 'job_id', p_job_id);
end;
$$;

create or replace function public.accept_job_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tok public.job_join_tokens%rowtype;
  v_job public.jobs%rowtype;
  v_role text := 'dancer';
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_tok
  from public.job_join_tokens
  where token = trim(p_token)
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_tok.revoked_at is not null
     or (v_tok.expires_at is not null and v_tok.expires_at <= now()) then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_job from public.jobs where id = v_tok.job_id;
  if not found or coalesce(v_job.job_kind, '') is distinct from 'production' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(jpi.role, jm.member_role, 'dancer')
  into v_role
  from (select 1) s
  left join public.job_pending_invites jpi
    on jpi.job_id = v_job.id
   and jpi.invited_user_id = v_uid
   and jpi.status = 'pending'
  left join public.job_members jm
    on jm.job_id = v_job.id
   and jm.user_id = v_uid
  limit 1;

  return public.activate_production_job_member(
    v_job.id,
    v_uid,
    coalesce(v_role, 'dancer'),
    'join_link'
  );
end;
$$;

revoke all on function public.accept_job_invite(text) from public;
grant execute on function public.accept_job_invite(text) to authenticated;

create or replace function public.respond_production_job_invite(
  p_source_id uuid,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.job_members%rowtype;
  v_invite public.job_pending_invites%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_action not in ('accept', 'decline') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  select * into v_member
  from public.job_members
  where id = p_source_id and user_id = v_uid;

  if found then
    if p_action = 'decline' then
      update public.job_members
      set status = 'declined', updated_at = now()
      where id = v_member.id;
      return jsonb_build_object('ok', true, 'status', 'declined');
    end if;
    return public.activate_production_job_member(
      v_member.job_id,
      v_uid,
      coalesce(v_member.member_role, 'dancer'),
      coalesce(v_member.source, 'direct_invite')
    );
  end if;

  select * into v_invite
  from public.job_pending_invites
  where id = p_source_id and invited_user_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_action = 'decline' then
    update public.job_pending_invites
    set status = 'declined', responded_at = now()
    where id = v_invite.id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;

  return public.activate_production_job_member(
    v_invite.job_id,
    v_uid,
    v_invite.role,
    'direct_invite'
  );
end;
$$;

revoke all on function public.respond_production_job_invite(uuid, text) from public;
grant execute on function public.respond_production_job_invite(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Invite / remove members
-- ---------------------------------------------------------------------------

drop function if exists public.invite_users_to_job(uuid, uuid[], text);

create or replace function public.invite_users_to_job(
  p_job_id uuid,
  p_user_ids uuid[],
  p_role text default 'dancer',
  p_source text default 'direct_invite'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  uid uuid;
  v_count int := 0;
  v_source text := coalesce(nullif(trim(both from p_source), ''), 'direct_invite');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_production_job(p_job_id) then
    return jsonb_build_object('ok', false, 'error', 'not_production_job');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_role not in ('choreographer', 'assistant', 'dancer') then
    return jsonb_build_object('ok', false, 'error', 'invalid_role');
  end if;

  if v_source not in (
    'casting_final_select',
    'direct_invite',
    'manual',
    'roster_copy',
    'join_link'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_source');
  end if;

  foreach uid in array coalesce(p_user_ids, array[]::uuid[])
  loop
    if uid = v_uid then
      continue;
    end if;
    insert into public.job_members (
      job_id, user_id, status, source, invited_by, member_role
    )
    values (
      p_job_id, uid, 'pending', v_source, v_uid, p_role
    )
    on conflict (job_id, user_id) do update
    set status = case
          when public.job_members.status = 'active' then 'active'
          when public.job_members.status = 'removed' then 'pending'
          else 'pending'
        end,
        member_role = excluded.member_role,
        source = excluded.source,
        invited_by = v_uid,
        updated_at = now();
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'invited', v_count);
end;
$$;

revoke all on function public.invite_users_to_job(uuid, uuid[], text, text) from public;
grant execute on function public.invite_users_to_job(uuid, uuid[], text, text) to authenticated;

-- Create or attach a production job from casting final selects (pending dancers).
create or replace function public.create_or_attach_production_job_from_casting(
  p_title text,
  p_dancer_user_ids uuid[],
  p_existing_job_id uuid default null,
  p_role_id uuid default null,
  p_project_id uuid default null,
  p_start_date date default null,
  p_end_date date default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job_id uuid;
  v_created jsonb;
  v_invite jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.can_user_create_production_jobs(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_existing_job_id is not null then
    if not public.is_production_job(p_existing_job_id) then
      return jsonb_build_object('ok', false, 'error', 'not_production_job');
    end if;
    if not (
      public.is_job_organizer(p_existing_job_id, v_uid)
      or public.is_job_admin(v_uid)
    ) then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
    v_job_id := p_existing_job_id;
  else
    v_created := public.create_production_job(
      p_title := coalesce(nullif(trim(both from p_title), ''), 'Job'),
      p_start_date := p_start_date,
      p_end_date := p_end_date,
      p_choreographer_ids := array[v_uid]::uuid[],
      p_assistant_ids := '{}'::uuid[],
      p_talent_list_id := null
    );
    if coalesce((v_created ->> 'ok')::boolean, false) is not true then
      return v_created;
    end if;
    v_job_id := (v_created ->> 'job_id')::uuid;
  end if;

  if p_role_id is not null or p_project_id is not null then
    update public.jobs
    set
      role_id = coalesce(p_role_id, role_id),
      project_id = coalesce(p_project_id, project_id),
      job_kind = 'production',
      updated_at = now()
    where id = v_job_id;
  end if;

  v_invite := public.invite_users_to_job(
    p_job_id := v_job_id,
    p_user_ids := coalesce(p_dancer_user_ids, '{}'::uuid[]),
    p_role := 'dancer',
    p_source := 'casting_final_select'
  );

  return jsonb_build_object(
    'ok', true,
    'job_id', v_job_id,
    'token', v_created ->> 'token',
    'url', v_created ->> 'url',
    'invited', v_invite -> 'invited',
    'created', p_existing_job_id is null
  );
end;
$$;

revoke all on function public.create_or_attach_production_job_from_casting(text, uuid[], uuid, uuid, uuid, date, date) from public;
grant execute on function public.create_or_attach_production_job_from_casting(text, uuid[], uuid, uuid, uuid, date, date) to authenticated;

create or replace function public.remove_job_member(
  p_job_id uuid,
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.job_members
  set status = 'removed', updated_at = now()
  where job_id = p_job_id and user_id = p_user_id;

  update public.job_pending_invites
  set status = 'revoked', responded_at = now()
  where job_id = p_job_id
    and invited_user_id = p_user_id
    and status = 'pending';

  perform public.sync_job_inbox_channel_members(p_job_id);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.remove_job_member(uuid, uuid) from public;
grant execute on function public.remove_job_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Link / unlink activities
-- ---------------------------------------------------------------------------

create or replace function public.link_activity_to_job(
  p_job_id uuid,
  p_activity_id uuid default null,
  p_project_id uuid default null,
  p_purpose text default 'other'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_link_id uuid;
  v_purpose text := coalesce(nullif(trim(p_purpose), ''), 'other');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_production_job(p_job_id) then
    return jsonb_build_object('ok', false, 'error', 'not_production_job');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if (p_activity_id is null and p_project_id is null)
     or (p_activity_id is not null and p_project_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'xor_required');
  end if;

  if v_purpose not in ('rehearsal', 'class', 'casting', 'show', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_purpose');
  end if;

  insert into public.job_linked_activities (
    job_id, activity_id, project_id, purpose, created_by
  )
  values (
    p_job_id, p_activity_id, p_project_id, v_purpose, v_uid
  )
  on conflict do nothing
  returning id into v_link_id;

  if v_link_id is null then
    select id into v_link_id
    from public.job_linked_activities
    where job_id = p_job_id
      and (
        (p_activity_id is not null and activity_id = p_activity_id)
        or (p_project_id is not null and project_id = p_project_id)
      )
    limit 1;
  end if;

  if p_activity_id is not null and v_purpose in ('rehearsal', 'class', 'show') then
    perform public.enroll_accepted_dancers_on_activity(p_job_id, p_activity_id);
  end if;

  return jsonb_build_object('ok', true, 'link_id', v_link_id);
end;
$$;

revoke all on function public.link_activity_to_job(uuid, uuid, uuid, text) from public;
grant execute on function public.link_activity_to_job(uuid, uuid, uuid, text) to authenticated;

create or replace function public.unlink_activity_from_job(
  p_job_id uuid,
  p_link_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not (
    public.is_job_organizer(p_job_id, v_uid)
    or public.is_job_admin(v_uid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.job_linked_activities
  where id = p_link_id and job_id = p_job_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.unlink_activity_from_job(uuid, uuid) from public;
grant execute on function public.unlink_activity_from_job(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Complete + resume credits
-- ---------------------------------------------------------------------------

create or replace function public.complete_production_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_chor_ids uuid[];
  v_assistant_ids uuid[];
  v_dancer_ids uuid[];
  v_chor_names text[];
  v_assistant_names text[];
  r record;
  v_entry jsonb;
  v_entry_id text;
  v_experiences jsonb;
  v_credited int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_job from public.jobs where id = p_job_id;
  if not found or coalesce(v_job.job_kind, '') is distinct from 'production' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_job.poster_id is distinct from v_uid and not public.is_job_admin(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.jobs
  set status = 'completed', updated_at = now()
  where id = p_job_id;

  select coalesce(array_agg(jm.user_id order by jm.created_at), '{}')
  into v_chor_ids
  from public.job_members jm
  where jm.job_id = p_job_id and jm.status = 'active' and jm.member_role = 'choreographer';

  select coalesce(array_agg(jm.user_id order by jm.created_at), '{}')
  into v_assistant_ids
  from public.job_members jm
  where jm.job_id = p_job_id and jm.status = 'active' and jm.member_role = 'assistant';

  select coalesce(array_agg(jm.user_id order by jm.created_at), '{}')
  into v_dancer_ids
  from public.job_members jm
  where jm.job_id = p_job_id and jm.status = 'active' and coalesce(jm.member_role, 'dancer') = 'dancer';

  select coalesce(array_agg(
    coalesce(
      nullif(trim(both from p.display_name), ''),
      nullif(trim(both from p.first_name || ' ' || coalesce(p.last_name, '')), ''),
      'Choreographer'
    )
    order by jm.created_at
  ), '{}')
  into v_chor_names
  from public.job_members jm
  join public.profiles p on p.user_id = jm.user_id
  where jm.job_id = p_job_id and jm.status = 'active' and jm.member_role = 'choreographer';

  select coalesce(array_agg(
    coalesce(
      nullif(trim(both from p.display_name), ''),
      nullif(trim(both from p.first_name || ' ' || coalesce(p.last_name, '')), ''),
      'Assistant'
    )
    order by jm.created_at
  ), '{}')
  into v_assistant_names
  from public.job_members jm
  join public.profiles p on p.user_id = jm.user_id
  where jm.job_id = p_job_id and jm.status = 'active' and jm.member_role = 'assistant';

  for r in
    select distinct uid from (
      select v_job.poster_id as uid
      union
      select unnest(v_chor_ids)
      union
      select unnest(v_assistant_ids)
      union
      select unnest(v_dancer_ids)
    ) s
    where uid is not null
  loop
    if exists (
      select 1 from public.job_resume_credits jrc
      where jrc.job_id = p_job_id and jrc.user_id = r.uid
    ) then
      continue;
    end if;

    v_entry_id := gen_random_uuid()::text;
    v_entry := jsonb_build_object(
      'id', v_entry_id,
      'title', v_job.title,
      'start_date', v_job.start_date,
      'end_date', v_job.end_date,
      'category', 'live',
      'source_job_id', p_job_id,
      'choreographer_user_ids', to_jsonb(v_chor_ids),
      'assistant_user_ids', to_jsonb(v_assistant_ids),
      'dancer_user_ids', to_jsonb(v_dancer_ids),
      'industry_professional_user_id', v_job.poster_id,
      'choreographers', to_jsonb(v_chor_names),
      'assistants', to_jsonb(v_assistant_names),
      'role', case
        when r.uid = v_job.poster_id then 'Industry Professional'
        when r.uid = any (v_chor_ids) then 'Choreographer'
        when r.uid = any (v_assistant_ids) then 'Assistant'
        else 'Dancer'
      end
    );

    select coalesce(experiences, '[]'::jsonb)
    into v_experiences
    from public.profiles
    where user_id = r.uid;

    update public.profiles
    set experiences = coalesce(v_experiences, '[]'::jsonb) || jsonb_build_array(v_entry),
        updated_at = now()
    where user_id = r.uid;

    insert into public.job_resume_credits (
      job_id, user_id, status, experience_entry_id
    )
    values (
      p_job_id, r.uid, 'proposed', v_entry_id
    )
    on conflict (job_id, user_id) do nothing;

    v_credited := v_credited + 1;
  end loop;

  return jsonb_build_object('ok', true, 'credited', v_credited);
end;
$$;

revoke all on function public.complete_production_job(uuid) from public;
grant execute on function public.complete_production_job(uuid) to authenticated;

create or replace function public.respond_to_job_resume_credit(
  p_job_id uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credit public.job_resume_credits%rowtype;
  v_experiences jsonb;
  v_new jsonb := '[]'::jsonb;
  elem jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_status not in ('accepted', 'edited', 'hidden') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select * into v_credit
  from public.job_resume_credits
  where job_id = p_job_id and user_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.job_resume_credits
  set status = p_status, updated_at = now()
  where id = v_credit.id;

  if p_status = 'hidden' and v_credit.experience_entry_id is not null then
    select coalesce(experiences, '[]'::jsonb)
    into v_experiences
    from public.profiles
    where user_id = v_uid;

    for elem in select * from jsonb_array_elements(coalesce(v_experiences, '[]'::jsonb))
    loop
      if coalesce(elem->>'id', '') is distinct from v_credit.experience_entry_id
         and coalesce(elem->>'source_job_id', '') is distinct from p_job_id::text then
        v_new := v_new || jsonb_build_array(elem);
      elsif coalesce(elem->>'source_job_id', '') = p_job_id::text then
        -- drop hidden job credit entry
        null;
      elsif coalesce(elem->>'id', '') = v_credit.experience_entry_id then
        null;
      else
        v_new := v_new || jsonb_build_array(elem);
      end if;
    end loop;

    update public.profiles
    set experiences = v_new, updated_at = now()
    where user_id = v_uid;
  end if;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

revoke all on function public.respond_to_job_resume_credit(uuid, text) from public;
grant execute on function public.respond_to_job_resume_credit(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Inbox: production_job pending requests (wrap existing wrappers)
-- ---------------------------------------------------------------------------

create or replace function public.list_pending_requests(p_limit int default 20)
returns table (
  id uuid,
  request_kind text,
  title text,
  header_text text,
  detail_text text,
  cover_url text,
  inviter_user_id uuid,
  inviter_name text,
  inviter_avatar_url text,
  ref_activity_id uuid,
  ref_role_id uuid,
  ref_job_id uuid,
  ref_job_group_id uuid,
  ref_workspace_job_id uuid,
  actor_role text,
  activity_requires_payment boolean,
  sort_key timestamptz
)
language plpgsql
security definer
stable
set search_path = public, auth
as $fn$
begin
  return query
  select * from (
    select * from public.list_pending_requests_core(100)

    union all

    select
      aft.id,
      'activity_featured_talent'::text,
      a.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Host')
        || ' invited you to be featured at')::text,
      coalesce(
        nullif(
          trim(
            both from coalesce(a.activity_date::text, '')
              || case
                when a.start_time is not null and trim(a.start_time::text) <> ''
                  then ' · ' || left(trim(a.start_time::text), 5)
                else ''
              end
          ),
          ''
        ),
        case when aft.parent_id is null then 'Featured talent' else 'Supporting talent' end
      )::text,
      a.cover_image_url,
      coalesce(aft.invited_by_user_id, a.creator_id),
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      a.id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      aft.created_at
    from public.activity_featured_talent aft
    join public.activities a on a.id = aft.activity_id
    left join public.profiles pinv on pinv.user_id = coalesce(aft.invited_by_user_id, a.creator_id)
    where aft.talent_user_id = auth.uid()
      and aft.status = 'pending'
      and coalesce(a.status, 'active') = 'active'

    union all

    select
      jm.id,
      'production_job'::text,
      j.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Someone')
        || ' added you to ' || coalesce(j.title, 'a job'))::text,
      coalesce(
        nullif(
          trim(
            both from coalesce(j.start_date::text, '')
              || case when j.end_date is not null then ' – ' || j.end_date::text else '' end
          ),
          ''
        ),
        'Job invite'
      )::text,
      j.cover_image_url,
      coalesce(jm.invited_by, j.poster_id),
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      null::uuid,
      null::uuid,
      j.id,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      jm.created_at
    from public.job_members jm
    join public.jobs j on j.id = jm.job_id
    left join public.profiles pinv on pinv.user_id = coalesce(jm.invited_by, j.poster_id)
    where jm.user_id = auth.uid()
      and jm.status = 'pending'
      and j.job_kind = 'production'
  ) as combined
  order by sort_key desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$fn$;

revoke all on function public.list_pending_requests(int) from public;
grant execute on function public.list_pending_requests(int) to authenticated;

create or replace function public.respond_to_request(
  p_request_kind text,
  p_source_id uuid,
  p_action text,
  p_response_kind text default null,
  p_response_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_request_kind = 'activity_featured_talent' then
    return public.respond_activity_featured_talent(p_source_id, p_action);
  end if;

  if p_request_kind = 'production_job' then
    return public.respond_production_job_invite(p_source_id, p_action);
  end if;

  return public.respond_to_request_core(
    p_request_kind,
    p_source_id,
    p_action,
    p_response_kind,
    p_response_note
  );
end;
$$;

revoke all on function public.respond_to_request(text, uuid, text, text, text) from public;
grant execute on function public.respond_to_request(text, uuid, text, text, text) to authenticated;

-- Keep inbox members in sync when membership status changes
create or replace function public.trg_sync_job_inbox_on_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if public.is_production_job(old.job_id) then
      perform public.sync_job_inbox_channel_members(old.job_id);
    end if;
    return old;
  end if;

  if public.is_production_job(new.job_id)
     and (
       tg_op = 'INSERT'
       or old.status is distinct from new.status
     ) then
    perform public.sync_job_inbox_channel_members(new.job_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_members_sync_production_inbox on public.job_members;
create trigger trg_job_members_sync_production_inbox
after insert or update of status or delete
on public.job_members
for each row execute function public.trg_sync_job_inbox_on_member_change();
