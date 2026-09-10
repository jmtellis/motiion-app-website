-- Off-platform featured talent invites: person-specific one-use share links.
-- After talent signup + onboarding, claim creates a normal activity_featured_talent row.

create table if not exists public.activity_featured_talent_invites (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  parent_id uuid references public.activity_featured_talent(id) on delete cascade,
  display_name text not null,
  email text,
  token text not null unique,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'revoked')),
  claimed_user_id uuid references auth.users(id) on delete set null,
  claimed_featured_talent_id uuid references public.activity_featured_talent(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_aft_invites_activity_status
  on public.activity_featured_talent_invites (activity_id, status);

create index if not exists idx_aft_invites_token
  on public.activity_featured_talent_invites (token);

create unique index if not exists idx_aft_invites_pending_name
  on public.activity_featured_talent_invites (
    activity_id,
    lower(trim(display_name)),
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'pending';

comment on table public.activity_featured_talent_invites is
  'Person-specific off-platform featured talent invite links. Claimed after talent signup.';

alter table public.activity_featured_talent_invites enable row level security;

-- Managers can read/manage invites for their events.
drop policy if exists "Managers manage featured talent invites" on public.activity_featured_talent_invites;
create policy "Managers manage featured talent invites"
  on public.activity_featured_talent_invites
  for all
  to authenticated
  using (public.is_activity_manager(activity_id))
  with check (public.is_activity_manager(activity_id));

-- Accepted L1 can read their own children's off-platform invites.
drop policy if exists "Level1 read child featured talent invites" on public.activity_featured_talent_invites;
create policy "Level1 read child featured talent invites"
  on public.activity_featured_talent_invites
  for select
  to authenticated
  using (
    parent_id is not null
    and public.is_accepted_featured_talent_l1(parent_id)
  );

create or replace function public.generate_featured_talent_invite_token_value()
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

create or replace function public.create_activity_featured_talent_invite(
  p_activity_id uuid,
  p_display_name text,
  p_parent_id uuid default null,
  p_email text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
      and talent_user_id = v_uid;
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
$$;

revoke all on function public.create_activity_featured_talent_invite(uuid, text, uuid, text) from public;
grant execute on function public.create_activity_featured_talent_invite(uuid, text, uuid, text) to authenticated;

create or replace function public.list_activity_featured_talent_invites(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not (
    public.is_activity_manager(p_activity_id)
    or exists (
      select 1 from public.activity_featured_talent aft
      where aft.activity_id = p_activity_id
        and aft.talent_user_id = v_uid
        and aft.status = 'accepted'
        and aft.parent_id is null
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'activity_id', i.activity_id,
      'parent_id', i.parent_id,
      'display_name', i.display_name,
      'email', i.email,
      'token', i.token,
      'url', 'https://www.motiion.app/featured-invite/' || i.token,
      'status', i.status,
      'invited_by_user_id', i.invited_by_user_id,
      'expires_at', i.expires_at,
      'created_at', i.created_at
    )
    order by i.created_at desc
  ), '[]'::jsonb)
  into v_rows
  from public.activity_featured_talent_invites i
  where i.activity_id = p_activity_id
    and i.status = 'pending'
    and (
      public.is_activity_manager(p_activity_id)
      or (
        i.parent_id is not null
        and public.is_accepted_featured_talent_l1(i.parent_id)
      )
    );

  return jsonb_build_object('ok', true, 'invites', v_rows);
end;
$$;

revoke all on function public.list_activity_featured_talent_invites(uuid) from public;
grant execute on function public.list_activity_featured_talent_invites(uuid) to authenticated;

create or replace function public.revoke_activity_featured_talent_invite(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.activity_featured_talent_invites%rowtype;
  v_can boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.activity_featured_talent_invites where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_row.status is distinct from 'pending' then
    return jsonb_build_object('ok', true, 'noop', true, 'status', v_row.status);
  end if;

  if public.is_activity_manager(v_row.activity_id) then
    v_can := true;
  elsif v_row.parent_id is not null
    and public.is_accepted_featured_talent_l1(v_row.parent_id) then
    v_can := true;
  end if;

  if not v_can then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.activity_featured_talent_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'status', 'revoked');
end;
$$;

revoke all on function public.revoke_activity_featured_talent_invite(uuid) from public;
grant execute on function public.revoke_activity_featured_talent_invite(uuid) to authenticated;

create or replace function public.get_activity_featured_talent_invite_card(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_inv public.activity_featured_talent_invites%rowtype;
  v_title text;
  v_cover text;
  v_inviter text;
  v_activity_id uuid;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_inv
  from public.activity_featured_talent_invites
  where token = lower(trim(p_token))
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_inv.status = 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'revoked');
  end if;

  if v_inv.status = 'claimed' then
    return jsonb_build_object('ok', false, 'error', 'claimed');
  end if;

  if v_inv.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select a.id, a.title, a.cover_image_url
    into v_activity_id, v_title, v_cover
  from public.activities a
  where a.id = v_inv.activity_id;

  if v_activity_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_inviter := coalesce(
    public._notif_profile_display_name(v_inv.invited_by_user_id),
    'Someone'
  );

  return jsonb_build_object(
    'ok', true,
    'token', v_inv.token,
    'invite_id', v_inv.id,
    'activity_id', v_inv.activity_id,
    'parent_id', v_inv.parent_id,
    'display_name', v_inv.display_name,
    'event_title', coalesce(nullif(trim(v_title), ''), 'Event'),
    'cover_image_url', v_cover,
    'inviter_name', v_inviter,
    'expires_at', v_inv.expires_at
  );
end;
$$;

revoke all on function public.get_activity_featured_talent_invite_card(text) from public;
grant execute on function public.get_activity_featured_talent_invite_card(text) to anon, authenticated;

create or replace function public.claim_activity_featured_talent_invite(
  p_token text,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.activity_featured_talent_invites%rowtype;
  v_existing record;
  v_parent record;
  v_sort int;
  v_ft_id uuid;
  v_status text;
  v_is_talent boolean := false;
  v_respond jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_action not in ('accept', 'decline', 'link') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_inv
  from public.activity_featured_talent_invites
  where token = lower(trim(p_token))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_inv.status = 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'revoked');
  end if;

  if v_inv.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- Already claimed by this user: allow accept/decline on linked row.
  if v_inv.status = 'claimed' then
    if v_inv.claimed_user_id is distinct from v_uid then
      return jsonb_build_object('ok', false, 'error', 'claimed');
    end if;
    if p_action = 'link' then
      return jsonb_build_object(
        'ok', true,
        'noop', true,
        'featured_talent_id', v_inv.claimed_featured_talent_id,
        'activity_id', v_inv.activity_id,
        'status', 'pending'
      );
    end if;
    if v_inv.claimed_featured_talent_id is null then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
    v_respond := public.respond_activity_featured_talent(
      v_inv.claimed_featured_talent_id,
      case when p_action = 'accept' then 'accept' else 'decline' end
    );
    return v_respond || jsonb_build_object(
      'featured_talent_id', v_inv.claimed_featured_talent_id,
      'activity_id', v_inv.activity_id
    );
  end if;

  select 'talent' = any (coalesce(enabled_shells, '{}'::text[]))
    into v_is_talent
  from public.profiles
  where user_id = v_uid;

  if not coalesce(v_is_talent, false) then
    -- Fallback for profiles that still only have account_type.
    select lower(coalesce(account_type, '')) = 'talent'
      into v_is_talent
    from public.profiles
    where user_id = v_uid;
  end if;

  if not coalesce(v_is_talent, false) then
    return jsonb_build_object('ok', false, 'error', 'talent_only');
  end if;

  if v_inv.parent_id is not null then
    select * into v_parent
    from public.activity_featured_talent
    where id = v_inv.parent_id and activity_id = v_inv.activity_id;
    if not found or v_parent.parent_id is not null then
      return jsonb_build_object('ok', false, 'error', 'invalid_parent');
    end if;
  end if;

  select * into v_existing
  from public.activity_featured_talent
  where activity_id = v_inv.activity_id and talent_user_id = v_uid;

  if found then
    if v_existing.status in ('pending', 'accepted') then
      v_ft_id := v_existing.id;
    else
      update public.activity_featured_talent
      set
        parent_id = v_inv.parent_id,
        invited_by_user_id = v_inv.invited_by_user_id,
        status = 'pending',
        video_url = case when v_inv.parent_id is null then video_url else null end,
        responded_at = null,
        updated_at = now()
      where id = v_existing.id
      returning id into v_ft_id;
    end if;
  else
    select coalesce(max(sort_order), -1) + 1 into v_sort
    from public.activity_featured_talent
    where activity_id = v_inv.activity_id
      and parent_id is not distinct from v_inv.parent_id;

    insert into public.activity_featured_talent (
      activity_id, talent_user_id, parent_id, invited_by_user_id, status, sort_order
    ) values (
      v_inv.activity_id, v_uid, v_inv.parent_id, v_inv.invited_by_user_id, 'pending', v_sort
    )
    returning id into v_ft_id;
  end if;

  update public.activity_featured_talent_invites
  set
    status = 'claimed',
    claimed_user_id = v_uid,
    claimed_featured_talent_id = v_ft_id,
    claimed_at = now(),
    updated_at = now()
  where id = v_inv.id;

  if p_action = 'link' then
    return jsonb_build_object(
      'ok', true,
      'featured_talent_id', v_ft_id,
      'activity_id', v_inv.activity_id,
      'status', 'pending'
    );
  end if;

  v_status := case when p_action = 'accept' then 'accepted' else 'declined' end;

  update public.activity_featured_talent
  set status = v_status, responded_at = now(), updated_at = now()
  where id = v_ft_id
    and talent_user_id = v_uid
    and status = 'pending';

  return jsonb_build_object(
    'ok', true,
    'featured_talent_id', v_ft_id,
    'activity_id', v_inv.activity_id,
    'status', v_status
  );
end;
$$;

revoke all on function public.claim_activity_featured_talent_invite(text, text) from public;
grant execute on function public.claim_activity_featured_talent_invite(text, text) to authenticated;
