-- Featured talent lineup for events (industry organizer → L1 talent → L2 talent).
-- Motiion ticketing remains; external_ticket_url is an optional off-platform link.

alter table public.activities
  add column if not exists external_ticket_url text;

comment on column public.activities.external_ticket_url is
  'Optional off-platform ticket URL shown on public event pages.';

create table if not exists public.activity_featured_talent (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  talent_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.activity_featured_talent(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'removed')),
  video_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (activity_id, talent_user_id)
);

create index if not exists idx_activity_featured_talent_activity
  on public.activity_featured_talent (activity_id, status, sort_order);

create index if not exists idx_activity_featured_talent_talent
  on public.activity_featured_talent (talent_user_id, status);

create index if not exists idx_activity_featured_talent_parent
  on public.activity_featured_talent (parent_id)
  where parent_id is not null;

comment on table public.activity_featured_talent is
  'Invite-accept featured talent tree for events. parent_id null = level 1; child = level 2 only.';

-- Validation trigger: talent-only, depth max 2, video only on L1, parent same activity + L1.
create or replace function public.trg_activity_featured_talent_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account text;
  v_parent_activity uuid;
  v_parent_parent uuid;
  v_activity_type text;
begin
  new.updated_at := now();

  select lower(coalesce(account_type, '')) into v_account
  from public.profiles
  where user_id = new.talent_user_id;

  if v_account is distinct from 'talent' then
    raise exception 'featured_talent_must_be_talent_profile';
  end if;

  select a.type::text into v_activity_type
  from public.activities a
  where a.id = new.activity_id;

  if v_activity_type is distinct from 'event' then
    raise exception 'featured_talent_event_only';
  end if;

  if new.parent_id is not null then
    select p.activity_id, p.parent_id
      into v_parent_activity, v_parent_parent
    from public.activity_featured_talent p
    where p.id = new.parent_id;

    if v_parent_activity is null then
      raise exception 'featured_talent_parent_missing';
    end if;
    if v_parent_activity is distinct from new.activity_id then
      raise exception 'featured_talent_parent_activity_mismatch';
    end if;
    if v_parent_parent is not null then
      raise exception 'featured_talent_max_depth';
    end if;
    if new.video_url is not null and trim(new.video_url) <> '' then
      raise exception 'featured_talent_video_level1_only';
    end if;
    new.video_url := null;
  end if;

  if new.video_url is not null then
    new.video_url := nullif(trim(new.video_url), '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activity_featured_talent_validate on public.activity_featured_talent;
create trigger trg_activity_featured_talent_validate
  before insert or update on public.activity_featured_talent
  for each row
  execute function public.trg_activity_featured_talent_validate();

alter table public.activity_featured_talent enable row level security;

-- Organizer / managers: full manage
drop policy if exists "Managers manage activity featured talent" on public.activity_featured_talent;
create policy "Managers manage activity featured talent"
  on public.activity_featured_talent
  for all
  to authenticated
  using (public.is_activity_manager(activity_id))
  with check (public.is_activity_manager(activity_id));

-- Invitee can read own row and update status (accept/decline)
drop policy if exists "Invitees read own featured talent rows" on public.activity_featured_talent;
create policy "Invitees read own featured talent rows"
  on public.activity_featured_talent
  for select
  to authenticated
  using (talent_user_id = auth.uid());

drop policy if exists "Invitees respond to featured talent invites" on public.activity_featured_talent;
create policy "Invitees respond to featured talent invites"
  on public.activity_featured_talent
  for update
  to authenticated
  using (talent_user_id = auth.uid())
  with check (talent_user_id = auth.uid());

-- Accepted L1 can manage their own children (insert/update/select)
drop policy if exists "Level1 manage child featured talent" on public.activity_featured_talent;
create policy "Level1 manage child featured talent"
  on public.activity_featured_talent
  for all
  to authenticated
  using (
    parent_id is not null
    and exists (
      select 1
      from public.activity_featured_talent parent
      where parent.id = activity_featured_talent.parent_id
        and parent.talent_user_id = auth.uid()
        and parent.status = 'accepted'
        and parent.parent_id is null
    )
  )
  with check (
    parent_id is not null
    and exists (
      select 1
      from public.activity_featured_talent parent
      where parent.id = activity_featured_talent.parent_id
        and parent.talent_user_id = auth.uid()
        and parent.status = 'accepted'
        and parent.parent_id is null
    )
  );

-- Accepted L1 can update own video_url / row
drop policy if exists "Level1 update own featured talent row" on public.activity_featured_talent;
create policy "Level1 update own featured talent row"
  on public.activity_featured_talent
  for update
  to authenticated
  using (
    talent_user_id = auth.uid()
    and parent_id is null
    and status = 'accepted'
  )
  with check (
    talent_user_id = auth.uid()
    and parent_id is null
  );

-- Public can read accepted rows for public active events
drop policy if exists "Public read accepted featured talent" on public.activity_featured_talent;
create policy "Public read accepted featured talent"
  on public.activity_featured_talent
  for select
  to anon, authenticated
  using (
    status = 'accepted'
    and exists (
      select 1
      from public.activities a
      where a.id = activity_featured_talent.activity_id
        and a.type = 'event'
        and coalesce(a.status, 'active') = 'active'
        and coalesce(a.is_private, false) = false
    )
  );

-- Invite RPC
create or replace function public.invite_activity_featured_talent(
  p_activity_id uuid,
  p_talent_user_id uuid,
  p_parent_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_can_invite boolean := false;
  v_parent record;
  v_existing record;
  v_sort int;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_talent_user_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'cannot_invite_self');
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.user_id = p_talent_user_id
      and lower(coalesce(p.account_type, '')) = 'talent'
  ) then
    return jsonb_build_object('ok', false, 'error', 'talent_only');
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
  end if;

  select * into v_existing
  from public.activity_featured_talent
  where activity_id = p_activity_id and talent_user_id = p_talent_user_id;

  if found then
    if v_existing.status in ('pending', 'accepted') then
      return jsonb_build_object('ok', true, 'id', v_existing.id, 'status', v_existing.status, 'noop', true);
    end if;
    -- Re-invite declined/removed
    update public.activity_featured_talent
    set
      parent_id = p_parent_id,
      invited_by_user_id = v_uid,
      status = 'pending',
      video_url = case when p_parent_id is null then video_url else null end,
      responded_at = null,
      updated_at = now()
    where id = v_existing.id
    returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending');
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_sort
  from public.activity_featured_talent
  where activity_id = p_activity_id
    and parent_id is not distinct from p_parent_id;

  insert into public.activity_featured_talent (
    activity_id, talent_user_id, parent_id, invited_by_user_id, status, sort_order
  ) values (
    p_activity_id, p_talent_user_id, p_parent_id, v_uid, 'pending', v_sort
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending');
end;
$$;

revoke all on function public.invite_activity_featured_talent(uuid, uuid, uuid) from public;
grant execute on function public.invite_activity_featured_talent(uuid, uuid, uuid) to authenticated;

create or replace function public.respond_activity_featured_talent(
  p_id uuid,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rowcount int;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_action not in ('accept', 'decline', 'primary', 'negative') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  v_status := case
    when p_action in ('accept', 'primary') then 'accepted'
    else 'declined'
  end;

  update public.activity_featured_talent
  set status = v_status, responded_at = now(), updated_at = now()
  where id = p_id
    and talent_user_id = v_uid
    and status = 'pending';
  get diagnostics v_rowcount = row_count;

  if v_rowcount = 0 then
    if exists (
      select 1 from public.activity_featured_talent
      where id = p_id and talent_user_id = v_uid and status in ('accepted', 'declined', 'removed')
    ) then
      return jsonb_build_object('ok', true, 'noop', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

revoke all on function public.respond_activity_featured_talent(uuid, text) from public;
grant execute on function public.respond_activity_featured_talent(uuid, text) to authenticated;

create or replace function public.remove_activity_featured_talent(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.activity_featured_talent%rowtype;
  v_can boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.activity_featured_talent where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if public.is_activity_manager(v_row.activity_id) then
    v_can := true;
  elsif v_row.parent_id is not null and exists (
    select 1 from public.activity_featured_talent parent
    where parent.id = v_row.parent_id
      and parent.talent_user_id = v_uid
      and parent.status = 'accepted'
      and parent.parent_id is null
  ) then
    v_can := true;
  end if;

  if not v_can then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.activity_featured_talent
  set status = 'removed', updated_at = now()
  where id = p_id
     or parent_id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.remove_activity_featured_talent(uuid) from public;
grant execute on function public.remove_activity_featured_talent(uuid) to authenticated;

create or replace function public.set_activity_featured_talent_video(
  p_id uuid,
  p_video_url text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.activity_featured_talent%rowtype;
  v_url text := nullif(trim(coalesce(p_video_url, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.activity_featured_talent where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_row.parent_id is not null then
    return jsonb_build_object('ok', false, 'error', 'video_level1_only');
  end if;
  if v_row.status is distinct from 'accepted' then
    return jsonb_build_object('ok', false, 'error', 'must_be_accepted');
  end if;

  if not (
    public.is_activity_manager(v_row.activity_id)
    or v_row.talent_user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.activity_featured_talent
  set video_url = v_url, updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'video_url', v_url);
end;
$$;

revoke all on function public.set_activity_featured_talent_video(uuid, text) from public;
grant execute on function public.set_activity_featured_talent_video(uuid, text) to authenticated;

-- Notification on invite
create or replace function public.trg_notif_featured_talent_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_inviter text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    v_title := public._notif_activity_title(new.activity_id);
    v_inviter := coalesce(public._notif_profile_display_name(new.invited_by_user_id), 'Someone');
    perform public.create_notification(
      new.talent_user_id,
      'activity_featured_talent_invite',
      'Event feature invite',
      v_inviter || ' invited you to be featured at "' || replace(v_title, '"', '\"') || '".',
      jsonb_build_object(
        'activity_id', new.activity_id::text,
        'activity_title', v_title,
        'entity_title', v_title,
        'request_id', new.id::text,
        'request_kind', 'activity_featured_talent',
        'actor_id', new.invited_by_user_id::text,
        'actor_display_name', v_inviter,
        'parent_id', new.parent_id::text,
        'dedupe_key', ('aft:' || new.id::text || ':pending')
      ),
      'aft:' || new.id::text || ':pending'
    );
  elsif tg_op = 'UPDATE'
    and old.status in ('declined', 'removed')
    and new.status = 'pending'
  then
    v_title := public._notif_activity_title(new.activity_id);
    v_inviter := coalesce(public._notif_profile_display_name(new.invited_by_user_id), 'Someone');
    perform public.create_notification(
      new.talent_user_id,
      'activity_featured_talent_invite',
      'Event feature invite',
      v_inviter || ' invited you to be featured at "' || replace(v_title, '"', '\"') || '".',
      jsonb_build_object(
        'activity_id', new.activity_id::text,
        'activity_title', v_title,
        'entity_title', v_title,
        'request_id', new.id::text,
        'request_kind', 'activity_featured_talent',
        'actor_id', new.invited_by_user_id::text,
        'actor_display_name', v_inviter,
        'parent_id', new.parent_id::text,
        'dedupe_key', ('aft:' || new.id::text || ':pending:' || extract(epoch from now())::bigint::text)
      ),
      'aft:' || new.id::text || ':pending:' || extract(epoch from now())::bigint::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notif_featured_talent_invite on public.activity_featured_talent;
create trigger trg_notif_featured_talent_invite
  after insert or update of status on public.activity_featured_talent
  for each row
  execute function public.trg_notif_featured_talent_invite();

create or replace function public.trg_notif_featured_talent_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_talent text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') and new.invited_by_user_id is not null then
    v_title := public._notif_activity_title(new.activity_id);
    v_talent := coalesce(public._notif_profile_display_name(new.talent_user_id), 'Someone');
    perform public.create_notification(
      new.invited_by_user_id,
      'activity_featured_talent_resolved',
      'Featured talent response',
      case
        when new.status = 'accepted' then v_talent || ' accepted your feature invite for "' || replace(v_title, '"', '\"') || '".'
        else v_talent || ' declined your feature invite for "' || replace(v_title, '"', '\"') || '".'
      end,
      jsonb_build_object(
        'activity_id', new.activity_id::text,
        'activity_title', v_title,
        'request_id', new.id::text,
        'request_kind', 'activity_featured_talent',
        'outcome', new.status,
        'actor_id', new.talent_user_id::text,
        'actor_display_name', v_talent,
        'dedupe_key', ('aft:' || new.id::text || ':' || new.status)
      ),
      'aft:' || new.id::text || ':' || new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notif_featured_talent_resolved on public.activity_featured_talent;
create trigger trg_notif_featured_talent_resolved
  after update of status on public.activity_featured_talent
  for each row
  execute function public.trg_notif_featured_talent_resolved();
