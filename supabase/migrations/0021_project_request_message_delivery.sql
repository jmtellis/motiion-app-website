-- Link casting outreach requests to projects and deliver talent responses into project-scoped DMs.

alter table public.availability_check_requests
  add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.size_sheet_requests
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists idx_availability_check_project
  on public.availability_check_requests (project_id)
  where project_id is not null;

create index if not exists idx_size_sheet_project
  on public.size_sheet_requests (project_id)
  where project_id is not null;

alter table public.conversations drop constraint if exists conversations_context_type_check;
alter table public.conversations add constraint conversations_context_type_check
  check (context_type is null or context_type in (
    'job', 'class', 'session', 'event', 'booking', 'agency', 'size_sheet', 'project', 'availability_check'
  ));

alter table public.message_requests drop constraint if exists message_requests_context_type_check;
alter table public.message_requests add constraint message_requests_context_type_check
  check (context_type is null or context_type in (
    'job', 'class', 'session', 'event', 'booking', 'agency', 'size_sheet', 'project', 'availability_check'
  ));

create or replace function public._tag_conversation_project_context(
  p_conversation_id uuid,
  p_project_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_conversation_id is null or p_project_id is null then
    return;
  end if;

  update public.conversations c
  set
    context_type = 'project',
    context_id = p_project_id,
    updated_at = now()
  where c.id = p_conversation_id
    and (
      c.context_type is null
      or c.context_type in ('size_sheet', 'availability_check', 'project')
    );
end;
$$;

create or replace function public._resolve_or_create_peer_conversation(
  p_talent_user_id uuid,
  p_requester_user_id uuid,
  p_context_type text,
  p_context_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv uuid;
begin
  if public.are_users_blocked(p_talent_user_id, p_requester_user_id) then
    return null;
  end if;

  v_conv := public.get_existing_conversation(p_talent_user_id, p_requester_user_id, p_context_type, p_context_id);

  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations (type, context_type, context_id, created_by)
  values ('direct', p_context_type, p_context_id, p_talent_user_id)
  returning id into v_conv;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    (v_conv, p_talent_user_id, public.messaging_user_role(p_talent_user_id)),
    (v_conv, p_requester_user_id, public.messaging_user_role(p_requester_user_id))
  on conflict (conversation_id, user_id) do nothing;

  return v_conv;
end;
$$;

create or replace function public._post_availability_response_message(
  p_request_id uuid,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.availability_check_requests%rowtype;
  v_conv uuid;
  v_message_id uuid;
  v_body text;
  v_preview text;
  v_status_line text;
begin
  select *
  into v_request
  from public.availability_check_requests acr
  where acr.id = p_request_id;

  if not found then
    return;
  end if;

  if v_request.status not in ('submitted', 'declined') then
    return;
  end if;

  v_status_line := case coalesce(v_request.response_kind, '')
    when 'available' then 'Available'
    when 'available_with_conflict' then 'Available with scheduling conflict'
    when 'unavailable' then 'Not available'
    else case when v_request.status = 'submitted' then 'Availability response' else 'Not available' end
  end;

  v_body := v_status_line;
  if nullif(trim(coalesce(v_request.title, '')), '') is not null then
    v_body := v_body || E'\n\nRe: ' || trim(v_request.title);
  end if;
  if nullif(trim(coalesce(p_note, v_request.response_note, '')), '') is not null then
    v_body := v_body || E'\n\n' || trim(coalesce(p_note, v_request.response_note, ''));
  end if;

  if v_request.project_id is not null then
    v_conv := public._resolve_or_create_peer_conversation(
      v_request.talent_id,
      v_request.requester_id,
      'project',
      v_request.project_id
    );
    perform public._tag_conversation_project_context(v_conv, v_request.project_id);
  else
    v_conv := public._resolve_or_create_peer_conversation(
      v_request.talent_id,
      v_request.requester_id,
      'availability_check',
      v_request.id
    );
  end if;

  if v_conv is null then
    return;
  end if;

  v_preview := public._messaging_message_body_preview(v_body, 'text');

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv, v_request.talent_id, v_body)
  returning id into v_message_id;

  perform public.notify_conversation_message(v_conv, v_message_id, v_request.talent_id, v_preview);
end;
$$;

create or replace function public.deliver_availability_chat_message(
  p_target_user_id uuid,
  p_request_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if not exists (
    select 1
    from public.availability_check_requests acr
    where acr.id = p_request_id
      and acr.talent_id = auth.uid()
      and acr.requester_id = p_target_user_id
      and acr.status in ('submitted', 'declined')
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  perform public._post_availability_response_message(p_request_id, p_note);

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

create or replace function public.trg_deliver_availability_response_to_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status in ('submitted', 'declined')
  then
    perform public._post_availability_response_message(new.id, new.response_note);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_availability_response_chat on public.availability_check_requests;
create trigger trg_availability_response_chat
  after update on public.availability_check_requests
  for each row
  execute function public.trg_deliver_availability_response_to_chat();


create or replace function public.deliver_size_sheet_chat_message(
  p_target_user_id uuid,
  p_request_id uuid,
  p_attachment jsonb,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv uuid;
  v_message_id uuid;
  v_body text;
  v_preview text;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_has_request boolean;
  v_project_id uuid;
  v_context_type text;
  v_context_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  if p_target_user_id is null or p_target_user_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'invalid_target');
  end if;

  if p_attachment is null or p_attachment = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'missing_attachment');
  end if;

  select s.project_id
  into v_project_id
  from public.size_sheet_requests s
  where s.id = p_request_id
    and s.talent_id = v_uid
    and s.requester_id = p_target_user_id
  limit 1;

  select exists (
    select 1
    from public.size_sheet_requests s
    where s.id = p_request_id
      and s.talent_id = v_uid
      and s.requester_id = p_target_user_id
      and s.status in ('fulfilled', 'pending')
  )
  into v_has_request;

  if not v_has_request then
    select exists (
      select 1
      from public.size_sheet_requests s
      where s.talent_id = v_uid
        and s.requester_id = p_target_user_id
        and s.status in ('fulfilled', 'pending', 'declined')
    )
    into v_has_request;
  end if;

  if not coalesce(v_has_request, false) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  if public.are_users_blocked(v_uid, p_target_user_id) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  if v_project_id is not null then
    v_context_type := 'project';
    v_context_id := v_project_id;
  else
    v_context_type := 'size_sheet';
    v_context_id := p_request_id;
  end if;

  v_conv := public.get_existing_conversation(v_uid, p_target_user_id, v_context_type, v_context_id);

  if v_conv is null then
    insert into public.conversations (type, context_type, context_id, created_by)
    values ('direct', v_context_type, v_context_id, v_uid)
    returning id into v_conv;

    insert into public.conversation_participants (conversation_id, user_id, role)
    values
      (v_conv, v_uid, public.messaging_user_role(v_uid)),
      (v_conv, p_target_user_id, public.messaging_user_role(p_target_user_id))
    on conflict (conversation_id, user_id) do nothing;
  end if;

  if v_project_id is not null then
    perform public._tag_conversation_project_context(v_conv, v_project_id);
  end if;

  if not public.is_conversation_participant(v_conv, v_uid) then
    insert into public.conversation_participants (conversation_id, user_id, role)
    values (v_conv, v_uid, public.messaging_user_role(v_uid))
    on conflict (conversation_id, user_id) do nothing;
  end if;

  if v_note is not null then
    insert into public.messages (conversation_id, sender_id, body)
    values (v_conv, v_uid, v_note)
    returning id into v_message_id;

    perform public.notify_conversation_message(v_conv, v_message_id, v_uid, v_note);
  end if;

  v_body := p_attachment::text;
  v_preview := public._messaging_message_body_preview(v_body, 'attachment');

  insert into public.messages (conversation_id, sender_id, body, message_type)
  values (v_conv, v_uid, v_body, 'attachment')
  returning id into v_message_id;

  perform public.notify_conversation_message(v_conv, v_message_id, v_uid, v_preview);

  return jsonb_build_object(
    'ok', true,
    'conversation_id', v_conv,
    'message_id', v_message_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

create or replace function public.can_message_in_context(
  p_current_user_id uuid,
  p_target_user_id uuid,
  p_context_type text,
  p_context_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_user_id is null or p_target_user_id is null or p_current_user_id = p_target_user_id then false
    when public.are_users_blocked(p_current_user_id, p_target_user_id) then false
    when public.get_existing_conversation(p_current_user_id, p_target_user_id, p_context_type, p_context_id) is not null then true
    when p_context_type = 'project' and p_context_id is not null then exists (
      select 1
      from public.projects p
      where p.id = p_context_id
        and (
          p.poster_id = p_current_user_id
          or exists (
            select 1
            from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = p_current_user_id
          )
        )
    )
    when p_context_type = 'job' then public.messaging_job_relationship_reason(p_current_user_id, p_target_user_id, p_context_id) is not null
    when p_context_type in ('class', 'session', 'event') then public.messaging_activity_relationship_reason(p_current_user_id, p_target_user_id, p_context_id) is not null
    when p_context_type = 'booking' then exists (
      select 1
      from public.booking_confirmation_requests b
      where b.status in ('pending', 'confirmed')
        and b.id = p_context_id
        and ((b.requester_id = p_current_user_id and b.talent_id = p_target_user_id)
          or (b.requester_id = p_target_user_id and b.talent_id = p_current_user_id))
    )
    when p_context_type = 'size_sheet' then exists (
      select 1
      from public.size_sheet_requests s
      where s.status in ('pending', 'fulfilled', 'declined')
        and ((s.requester_id = p_current_user_id and s.talent_id = p_target_user_id)
          or (s.requester_id = p_target_user_id and s.talent_id = p_current_user_id))
    )
    when p_context_type = 'availability_check' then exists (
      select 1
      from public.availability_check_requests acr
      where acr.status in ('pending', 'submitted', 'declined')
        and ((acr.requester_id = p_current_user_id and acr.talent_id = p_target_user_id)
          or (acr.requester_id = p_target_user_id and acr.talent_id = p_current_user_id))
    )
    else public.can_message_user(p_current_user_id, p_target_user_id)
  end;
$$;

drop function if exists public.list_conversations();

create or replace function public.list_conversations()
returns table (
  conversation_id uuid,
  type text,
  context_type text,
  context_id uuid,
  context_title text,
  participant_user_id uuid,
  participant_name text,
  participant_role text,
  participant_avatar_url text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint,
  muted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with u as (select auth.uid() as uid),
  base as (
    select
      c.id,
      c.type,
      c.context_type,
      c.context_id,
      coalesce(j.title, a.title, pr.title, null) as context_title,
      case
        when nullif(trim(both from c.title), '') is not null then null
        else other.user_id
      end as participant_user_id,
      case
        when nullif(trim(both from c.title), '') is not null then trim(both from c.title)
        else coalesce(
          nullif(trim(both from p.display_name), ''),
          nullif(trim(both from p.first_name || ' ' || coalesce(p.last_name, '')), ''),
          'Motiion member'
        )
      end as participant_name,
      case
        when nullif(trim(both from c.title), '') is not null then null
        else coalesce(other.role, public.messaging_user_role(other.user_id))
      end as participant_role,
      case
        when nullif(trim(both from c.title), '') is not null then
          coalesce(
            nullif(trim(both from a_parent.cover_image_url), ''),
            nullif(trim(both from a.cover_image_url), '')
          )
        else case
          when jsonb_typeof(p.headshot_urls) = 'array' and jsonb_array_length(p.headshot_urls) > 0
            then p.headshot_urls->>0
          else null
        end
      end as participant_avatar_url,
      public._messaging_message_body_preview(lm.body, lm.message_type) as last_message_body,
      coalesce(lm.created_at, c.last_message_at, c.created_at) as last_message_at,
      lm.sender_id as last_message_sender_id,
      (
        select count(*)
        from public.messages m
        where m.conversation_id = c.id
          and m.message_type <> 'system'
          and m.sender_id is not null
          and m.sender_id <> (select uid from u)
          and m.deleted_at is null
          and (me.last_read_at is null or m.created_at > me.last_read_at)
      ) as unread_count,
      coalesce(me.muted, false) as muted
    from public.conversation_participants me
    join public.conversations c on c.id = me.conversation_id
    left join lateral (
      select cp.*
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.user_id <> (select uid from u)
      order by cp.joined_at
      limit 1
    ) other on true
    left join public.profiles p on p.user_id = other.user_id
    left join public.jobs j on c.context_type = 'job' and j.id = c.context_id
    left join public.activities a on c.context_type in ('class', 'session', 'event') and a.id = c.context_id
    left join public.activities a_parent on a.parent_activity_id is not null and a_parent.id = a.parent_activity_id
    left join public.projects pr on c.context_type = 'project' and pr.id = c.context_id
    left join lateral (
      select m.body, m.message_type, m.created_at, m.sender_id
      from public.messages m
      where m.conversation_id = c.id
        and m.deleted_at is null
        and m.message_type <> 'system'
        and m.sender_id is not null
      order by m.created_at desc
      limit 1
    ) lm on true
    where me.user_id = (select uid from u)
      and me.archived = false
      and c.status = 'active'
      and exists (
        select 1
        from public.messages hm
        where hm.conversation_id = c.id
          and hm.deleted_at is null
          and hm.message_type <> 'system'
          and hm.sender_id is not null
      )
  ),
  ranked as (
    select
      b.*,
      row_number() over (
        partition by coalesce(b.participant_user_id, b.id)
        order by b.last_message_at desc nulls last, b.id desc
      ) as rn
    from base b
  )
  select
    r.id,
    r.type,
    r.context_type,
    r.context_id,
    r.context_title,
    r.participant_user_id,
    r.participant_name,
    r.participant_role,
    r.participant_avatar_url,
    r.last_message_body,
    r.last_message_at,
    r.last_message_sender_id,
    r.unread_count,
    r.muted
  from ranked r
  where r.rn = 1
  order by r.last_message_at desc nulls last;
$$;

revoke all on function public.list_conversations() from public;
grant execute on function public.list_conversations() to authenticated;

revoke all on function public.deliver_availability_chat_message(uuid, uuid, text) from public;
grant execute on function public.deliver_availability_chat_message(uuid, uuid, text) to authenticated;
