-- Preserve the current card signature used by iOS and web while enforcing access.
-- No profile values or existing grants/shares are rewritten.
-- A bookmark/list entry is writable by its owner and is not consent to view a private profile.
-- Private cards require self access or a real talent-authored casting submission relationship.
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
            where sub.talent_id = pp.user_id and (
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


