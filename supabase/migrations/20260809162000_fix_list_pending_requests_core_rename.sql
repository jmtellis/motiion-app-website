-- Hotfix: inbox migration rename missed because identity args are 'p_limit integer', not 'integer'.
-- Recreate the previous list_pending_requests body as list_pending_requests_core.

create or replace function public.list_pending_requests_core(p_limit int default 20)
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
  with u as (select auth.uid() as uid)
  select * from (
    select
      ra.id,
      'casting'::text,
      r.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Casting') || ' is inviting you to check out')::text,
      coalesce(r.production, '')::text,
      coalesce(r.cover_image_url, p.cover_image_url) as c_cover,
      r.poster_id,
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      null::uuid,
      r.id,
      null::uuid,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      coalesce(ra.granted_at, now())
    from public.role_access ra
    join public.roles r on r.id = ra.role_id
    left join public.projects p on p.id = r.project_id
    left join public.profiles pinv on pinv.user_id = r.poster_id
    where ra.talent_id = (select uid from u)
      and ra.status = 'pending'
      and coalesce(r.is_active, true) = true

    union all

    select
      ai.id,
      case
        when a.type = 'class' then 'class_invite'
        when a.type = 'event' then 'event_invite'
        else 'session_invite'
      end,
      a.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Host') || ' is inviting you to')::text,
      coalesce(
        nullif(
          trim(
            both from coalesce(
              a.activity_date::text,
              ''
            ) || case
              when a.start_time is not null and trim(a.start_time::text) <> '' then ' · ' || left(trim(a.start_time::text), 5)
              else ''
            end
          ),
          ''
        ),
        'Schedule TBD'
      )::text,
      a.cover_image_url,
      a.creator_id,
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
      (
        case
          when a.type in ('class', 'event') then coalesce(a.require_payment, false)
          else false
        end
      ),
      greatest(ai.updated_at, ai.created_at)
    from public.activity_invites ai
    join public.activities a on a.id = ai.activity_id
    left join public.profiles pinv on pinv.user_id = coalesce(ai.invited_by, a.creator_id)
    where ai.invited_user_id = (select uid from u)
      and ai.is_active = true
      and ai.response_status = 'pending'
      and coalesce(a.status, 'active') = 'active'
      and not exists (
        select 1 from public.enrollments e
        where e.activity_id = a.id
          and e.student_id = ai.invited_user_id
          and e.status in ('paid', 'guest', 'comped')
      )

    union all

    select
      sjr.id,
      'session_join_organizer'::text,
      a.title,
      (coalesce(pr.display_name, pr.first_name || ' ' || coalesce(pr.last_name, ''), 'Someone') || ' asked to join')::text,
      coalesce(
        nullif(trim(both from a.location), ''),
        a.activity_date::text
      )::text,
      a.cover_image_url,
      sjr.requester_id,
      coalesce(
        nullif(trim(both from pr.display_name), ''),
        nullif(trim(both from pr.first_name || ' ' || coalesce(pr.last_name, '')), ''),
        'Dancer'
      ),
      (pr.headshot_urls #>> '{0}')::text,
      a.id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'organizer',
      false,
      sjr.created_at
    from public.session_join_requests sjr
    join public.activities a on a.id = sjr.activity_id
    left join public.profiles pr on pr.user_id = sjr.requester_id
    where sjr.status = 'pending'
      and a.type = 'session'
      and (
        a.creator_id = (select uid from u)
        or exists (
          select 1 from public.activity_collaborators ac
          where ac.activity_id = a.id and ac.user_id = (select uid from u)
        )
      )

    union all

    select
      sjr.id,
      'session_join_requester'::text,
      a.title,
      'Waiting for the host to approve your request'::text,
      coalesce(a.location, '')::text,
      a.cover_image_url,
      a.creator_id,
      coalesce(
        nullif(trim(both from ph.display_name), ''),
        nullif(trim(both from ph.first_name || ' ' || coalesce(ph.last_name, '')), ''),
        'Host'
      ),
      (ph.headshot_urls #>> '{0}')::text,
      a.id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'requester',
      false,
      sjr.created_at
    from public.session_join_requests sjr
    join public.activities a on a.id = sjr.activity_id
    left join public.profiles ph on ph.user_id = a.creator_id
    where sjr.requester_id = (select uid from u)
      and sjr.status = 'pending'
      and a.type = 'session'
      and not exists (
        select 1 from public.enrollments e
        where e.activity_id = a.id
          and e.student_id = sjr.requester_id
          and e.status in ('paid', 'guest')
      )

    union all

    select
      cgr.id,
      'class_guest_organizer'::text,
      a.title,
      (coalesce(pr.display_name, pr.first_name || ' ' || coalesce(pr.last_name, ''), 'Someone') || ' wants to guest your class')::text,
      coalesce(
        nullif(trim(both from a.location), ''),
        a.activity_date::text
      )::text,
      a.cover_image_url,
      cgr.requester_id,
      coalesce(
        nullif(trim(both from pr.display_name), ''),
        nullif(trim(both from pr.first_name || ' ' || coalesce(pr.last_name, '')), ''),
        'Dancer'
      ),
      (pr.headshot_urls #>> '{0}')::text,
      a.id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'organizer',
      false,
      cgr.created_at
    from public.class_guest_requests cgr
    join public.activities a on a.id = cgr.activity_id
    left join public.profiles pr on pr.user_id = cgr.requester_id
    where cgr.status = 'pending'
      and a.type = 'class'
      and coalesce(a.status, 'active') = 'active'
      and (
        a.creator_id = (select uid from u)
        or exists (
          select 1 from public.activity_collaborators ac
          where ac.activity_id = a.id and ac.user_id = (select uid from u)
        )
      )

    union all

    select
      cgr.id,
      'class_guest_requester'::text,
      a.title,
      'Waiting for the host to approve your guest request'::text,
      coalesce(a.location, '')::text,
      a.cover_image_url,
      a.creator_id,
      coalesce(
        nullif(trim(both from ph.display_name), ''),
        nullif(trim(both from ph.first_name || ' ' || coalesce(ph.last_name, '')), ''),
        'Host'
      ),
      (ph.headshot_urls #>> '{0}')::text,
      a.id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'requester',
      false,
      cgr.created_at
    from public.class_guest_requests cgr
    join public.activities a on a.id = cgr.activity_id
    left join public.profiles ph on ph.user_id = a.creator_id
    where cgr.requester_id = (select uid from u)
      and cgr.status = 'pending'
      and a.type = 'class'
      and not exists (
        select 1 from public.enrollments e
        where e.activity_id = a.id
          and e.student_id = cgr.requester_id
          and e.status in ('paid', 'guest')
      )

    union all

    select
      ci.id,
      'activity_collaborator_invite'::text,
      a.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Host') || ' invited you to co-organize')::text,
      coalesce(
        nullif(
          trim(
            both from coalesce(
              a.activity_date::text,
              ''
            ) || case
              when a.start_time is not null and trim(a.start_time::text) <> '' then ' · ' || left(trim(a.start_time::text), 5)
              else ''
            end
          ),
          ''
        ),
        'Schedule TBD'
      )::text,
      a.cover_image_url,
      coalesce(ci.invited_by, a.creator_id),
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
      ci.created_at
    from public.activity_collaborator_invites ci
    join public.activities a on a.id = ci.activity_id
    left join public.profiles pinv on pinv.user_id = coalesce(ci.invited_by, a.creator_id)
    where ci.invited_user_id = (select uid from u)
      and ci.status = 'pending'
      and coalesce(a.status, 'active') = 'active'

    union all

    select
      jgi.id,
      'job_group'::text,
      coalesce(ctx.title, jg.name, 'Group')::text,
      case
        when ctx.id is not null then
          (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Host') || ' is inviting you to')::text
        else
          (coalesce(pinv_legacy.display_name, pinv_legacy.first_name || ' ' || coalesce(pinv_legacy.last_name, ''), 'Organizer') || ' added you to a group')::text
      end,
      case
        when ctx.id is not null then
          coalesce(
            nullif(
              trim(
                both from coalesce(
                  ctx.activity_date::text,
                  ''
                ) || case
                  when ctx.start_time is not null and trim(ctx.start_time::text) <> '' then ' · ' || left(trim(ctx.start_time::text), 5)
                  else ''
                end
              ),
              ''
            ),
            'Schedule TBD'
          )::text
        else j.title
      end,
      coalesce(ctx.cover_image_url, j.cover_image_url),
      case
        when ctx.id is not null then ctx.creator_id
        else coalesce(jgi.invited_by, j.poster_id)
      end,
      case
        when ctx.id is not null then
          coalesce(
            nullif(trim(both from pinv.display_name), ''),
            nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
            'Host'
          )
        else
          coalesce(
            nullif(trim(both from pinv_legacy.display_name), ''),
            nullif(trim(both from pinv_legacy.first_name || ' ' || coalesce(pinv_legacy.last_name, '')), ''),
            'Host'
          )
      end,
      case
        when ctx.id is not null then (pinv.headshot_urls #>> '{0}')::text
        else (pinv_legacy.headshot_urls #>> '{0}')::text
      end,
      coalesce(ctx.id, ev.id),
      null::uuid,
      j.id,
      jg.id,
      jg.workspace_job_id,
      'invitee',
      case
        when ctx.id is not null then coalesce(ctx.require_payment, false)
        else false
      end,
      jgi.created_at
    from public.job_group_invites jgi
    join public.jobs j on j.id = jgi.job_id
    join public.job_groups jg on jg.id = jgi.job_group_id
    left join public.activities ctx on ctx.id = jgi.context_activity_id
    left join public.activities ev on ev.root_job_id = j.id and ev.type = 'event' and ctx.id is null
    left join public.profiles pinv on pinv.user_id = coalesce(ctx.creator_id, jgi.invited_by)
    left join public.profiles pinv_legacy on pinv_legacy.user_id = jgi.invited_by
    where jgi.invited_user_id = (select uid from u)
      and jgi.status = 'pending'

    union all

    select
      jgm.id,
      'subgroup_lead_setup'::text,
      coalesce(jg.name, 'Subgroup')::text,
      ('Finish setting up your subgroup for ' || coalesce(j.title, 'this event'))::text,
      coalesce(j.title, '')::text,
      j.cover_image_url,
      j.poster_id,
      coalesce(
        nullif(trim(both from porg.display_name), ''),
        nullif(trim(both from porg.first_name || ' ' || coalesce(porg.last_name, '')), ''),
        'Organizer'
      ),
      (porg.headshot_urls #>> '{0}')::text,
      ev.id,
      null::uuid,
      j.id,
      jg.id,
      jg.workspace_job_id,
      'invitee',
      false,
      jgm.created_at
    from public.job_group_members jgm
    join public.job_groups jg on jg.id = jgm.job_group_id
    join public.jobs j on j.id = jgm.job_id
    left join public.activities ev on ev.root_job_id = j.id and ev.type = 'event'
    left join public.profiles porg on porg.user_id = j.poster_id
    where jgm.member_user_id = (select uid from u)
      and jgm.member_role = 'lead'
      and jgm.subgroup_activity_id is null
      and jgm.subgroup_setup_completed_at is null
      and coalesce(j.job_type, '') = 'showcase'

    union all

    select
      acr.id,
      'availability_check'::text,
      case
        when acr.requester_id = acr.talent_id then
          coalesce(nullif(trim(both from acr.title), ''), 'Your availability')::text
        else acr.title
      end,
      case
        when acr.requester_id = acr.talent_id then 'You shared availability'::text
        else (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Request') || ' asked for your availability')::text
      end,
      case
        when acr.requester_id = acr.talent_id then
          coalesce(
            nullif(trim(both from coalesce(acr.message, '')), ''),
            (
              select string_agg(
                to_char((elem->>'start')::date, 'YYYY-MM-DD') || '..' || to_char((elem->>'end')::date, 'YYYY-MM-DD'),
                ' '
                order by (elem->>'start')::date
              )
              from jsonb_array_elements(coalesce(acr.date_ranges, '[]'::jsonb)) as elem
              where elem ? 'start' and elem ? 'end'
            ),
            nullif(trim(both from coalesce(acr.project_name, '')), ''),
            ''
          )::text
        else coalesce(acr.message, acr.project_name, '')::text
      end,
      (pinv.headshot_urls #>> '{0}')::text,
      acr.requester_id,
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      acr.created_at
    from public.availability_check_requests acr
    left join public.profiles pinv on pinv.user_id = acr.requester_id
    where acr.talent_id = (select uid from u) and acr.status = 'pending'

    union all

    select
      b.id,
      'booking_confirmation'::text,
      b.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Booker') || ' needs booking confirmation')::text,
      coalesce(to_char(b.event_start, 'Mon DD, YYYY · FMHH12:MI AM'), b.location, '')::text,
      (select proj.cover_image_url from public.jobs j2 left join public.projects proj on proj.id = j2.project_id where j2.id = b.job_id limit 1),
      b.requester_id,
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      null::uuid,
      b.role_id,
      b.job_id,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      b.created_at
    from public.booking_confirmation_requests b
    left join public.profiles pinv on pinv.user_id = b.requester_id
    where b.talent_id = (select uid from u) and b.status = 'pending'

    union all

    select
      s.id,
      'size_sheet'::text,
      'Size sheet request',
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Requester') || ' needs your size sheet')::text,
      coalesce(s.message, '')::text,
      (pinv.headshot_urls #>> '{0}')::text,
      s.requester_id,
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      s.created_at
    from public.size_sheet_requests s
    left join public.profiles pinv on pinv.user_id = s.requester_id
    where s.talent_id = (select uid from u) and s.status = 'pending'
  ) as combined
  order by sort_key desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$fn$;



revoke all on function public.list_pending_requests_core(int) from public;
grant execute on function public.list_pending_requests_core(int) to authenticated;
