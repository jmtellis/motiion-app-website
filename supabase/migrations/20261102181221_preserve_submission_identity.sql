-- Capture the authenticated actor, including inserts performed inside existing
-- SECURITY DEFINER RPCs. A project operator adding a person is not that person's
-- submission consent. Existing rows intentionally remain NULL: no inferred or
-- fabricated historical provenance is backfilled.
alter table public.submissions add column if not exists submitted_by uuid;
comment on column public.submissions.submitted_by is
  'Authenticated actor captured by the database on insertion; NULL means provenance is not established. Equality with talent_id establishes an account-authored submission, not an operator-created selection.';

create or replace function public.preserve_submission_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_role text := coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  );
begin
  if tg_op = 'INSERT' then
    -- Never accept client-supplied provenance, even when an RPC executes as
    -- postgres. Service inserts without an authenticated actor remain NULL.
    new.submitted_by := auth.uid();
    return new;
  end if;

  -- An ordinary request must not gain an exception merely by entering a
  -- SECURITY DEFINER function. Only a verified service JWT, or trusted direct
  -- database maintenance without request identity, can repair identity/proof.
  if v_request_role = 'service_role'
     or (v_request_role is null and auth.uid() is null
         and current_user in ('postgres', 'supabase_admin', 'service_role')) then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role_id is distinct from old.role_id
     or new.talent_id is distinct from old.talent_id
     or new.submitted_by is distinct from old.submitted_by then
    raise exception using
      errcode = '42501',
      message = 'A submission cannot be reassigned to a different identity, role, person, or submitter.';
  end if;

  return new;
end;
$$;
revoke all on function public.preserve_submission_identity() from public, anon, authenticated;
drop trigger if exists submissions_preserve_identity on public.submissions;
create trigger submissions_preserve_identity
before insert or update on public.submissions
for each row execute function public.preserve_submission_identity();

-- Keep current applicant/account eligibility and genuine applicant snapshots.
-- An operator-created selection must not copy private account contact/media.
-- Explicit material supplied by an authorized caller remains untouched; public
-- name/headshot presentation may still be filled for active public profiles.
create or replace function public.require_casting_applicant_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if new.talent_id is null or not exists (
    select 1 from auth.users u where u.id = new.talent_id
      and u.email_confirmed_at is not null and coalesce(u.is_anonymous, false) = false
  ) then
    raise exception 'Create an account and verify your email before submitting.';
  end if;
  select * into v_profile from public.profiles where user_id = new.talent_id;
  if not found then raise exception 'Add your account details before submitting.'; end if;
  if v_profile.onboarding_completed_at is null then
    if nullif(btrim(v_profile.first_name), '') is null
      or nullif(btrim(v_profile.last_name), '') is null
      or v_profile.date_of_birth is null
      or v_profile.date_of_birth > (current_date - interval '18 years')::date
      or coalesce(jsonb_array_length(to_jsonb(v_profile.headshot_urls)), 0) = 0
      or nullif(btrim(v_profile.resume_url), '') is null then
      raise exception 'Add your name, date of birth (18+), headshot and résumé before submitting.';
    end if;
  end if;

  if auth.uid() = new.talent_id
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    new.full_name := coalesce(nullif(btrim(v_profile.display_name), ''), concat_ws(' ', v_profile.first_name, v_profile.last_name));
    select u.email into new.email from auth.users u where u.id = new.talent_id;
    new.headshot_url := coalesce(new.headshot_url, to_jsonb(v_profile.headshot_urls) ->> 0);
    new.resume_url := coalesce(new.resume_url, v_profile.resume_url);
  elsif coalesce(v_profile.is_private, false) = false
        and coalesce(v_profile.moderation_status, 'active') = 'active' then
    new.full_name := coalesce(new.full_name, nullif(btrim(v_profile.display_name), ''), concat_ws(' ', v_profile.first_name, v_profile.last_name));
    new.headshot_url := coalesce(new.headshot_url, to_jsonb(v_profile.headshot_urls) ->> 0);
  end if;
  return new;
end;
$$;
revoke all on function public.require_casting_applicant_account() from public, anon, authenticated;
-- Production already has this shared native trigger; older staging branches may
-- not. Attach the reviewed function explicitly so both environments agree.
drop trigger if exists require_casting_applicant_account on public.submissions;
create trigger require_casting_applicant_account
before insert on public.submissions
for each row execute function public.require_casting_applicant_account();

-- Preserve the current card signature used by iOS and web while enforcing access.
-- No profile values or existing grants/shares are rewritten.
-- A bookmark/list entry is writable by its owner and is not consent to view a private profile.
-- Private cards require self access or captured account-authored submission provenance.
CREATE OR REPLACE FUNCTION public.hydrate_library_member_cards(p_profile_ids uuid[])
 RETURNS TABLE(profile_id uuid, user_id uuid, slug text, name text, location text, avatar_url text, styles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    pp.id as profile_id,
    pp.user_id,
    pp.slug,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      nullif(trim(p.username), ''),
      nullif(trim(pp.slug), ''),
      'Talent'
    ) as name,
    coalesce(
      nullif(
        trim(
          concat_ws(
            ', ',
            nullif(trim(pp.location_city), ''),
            nullif(trim(pp.location_region), '')
          )
        ),
        ''
      ),
      nullif(trim(p.working_locations ->> 0), '')
    ) as location,
    coalesce(
      (
        select nullif(trim(url), '')
        from jsonb_array_elements_text(coalesce(p.headshot_urls, '[]'::jsonb)) as url
        where nullif(trim(url), '') is not null
        limit 1
      ),
      (
        select coalesce(nullif(trim(ma.url), ''), nullif(trim(ma.storage_path), ''))
        from public.media_assets ma
        where ma.profile_id = pp.id
          and ma.kind = 'headshot'
        order by ma.position asc nulls last, ma.created_at asc nulls last
        limit 1
      )
    ) as avatar_url,
    coalesce(
      (
        select array_agg(style_value)
        from (
          select nullif(trim(value), '') as style_value
          from unnest(coalesce(pp.styles, '{}'::text[])) as value
          where nullif(trim(value), '') is not null
          limit 3
        ) limited_styles
      ),
      '{}'::text[]
    ) as styles
  from public.professional_profiles pp
  join public.profiles p on p.user_id = pp.user_id
  where pp.id = any (p_profile_ids)
    and coalesce(p.moderation_status, 'active') = 'active'
    and (
      auth.role() = 'service_role'
      or (
        auth.uid() is not null
        and (
          pp.user_id = auth.uid()
          or coalesce(p.is_private, false) = false
          or exists (
            select 1 from public.submissions sub
            join public.roles r on r.id = sub.role_id
            join public.projects project on project.id = r.project_id
            where sub.talent_id = pp.user_id
              and sub.submitted_by = sub.talent_id and (
              project.poster_id = auth.uid()
              or exists (
                select 1 from public.project_members member
                where member.project_id = project.id and member.user_id = auth.uid()
              )
            )
          )
        )
      )
    );
$function$;

revoke execute on function public.hydrate_library_member_cards(uuid[]) from public, anon;
grant execute on function public.hydrate_library_member_cards(uuid[]) to authenticated, service_role;


