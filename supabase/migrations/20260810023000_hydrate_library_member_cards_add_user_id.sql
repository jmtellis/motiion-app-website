drop function if exists public.hydrate_library_member_cards(uuid[]);

create function public.hydrate_library_member_cards(p_profile_ids uuid[])
returns table (
  profile_id uuid,
  user_id uuid,
  slug text,
  name text,
  location text,
  avatar_url text,
  styles text[]
)
language sql
stable
security definer
set search_path = public
as $$
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
        from media_assets ma
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
  from professional_profiles pp
  left join profiles p on p.user_id = pp.user_id
  where pp.id = any (p_profile_ids);
$$;

revoke all on function public.hydrate_library_member_cards(uuid[]) from public;
grant execute on function public.hydrate_library_member_cards(uuid[]) to authenticated, anon, service_role;
