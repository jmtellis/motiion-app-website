-- One atomic, account-scoped completion. Approval is checked under lock; existing
-- identity/contact/media/source values are never replaced by application snapshots.
create or replace function public.complete_industry_approved_setup(p_username text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  a public.industry_applications%rowtype;
  p public.profiles%rowtype;
  v_username text;
  v_role text;
begin
  if v_uid is null then raise exception 'Sign in to continue' using errcode='42501'; end if;
  select * into a from public.industry_applications where user_id=v_uid for update;
  if not found or a.status <> 'approved' then
    raise exception 'Industry approval is required' using errcode='42501';
  end if;
  select * into p from public.profiles where user_id=v_uid for update;
  if not found then raise exception 'Account profile is unavailable' using errcode='PT409'; end if;
  v_username := case when p.username ~ '^[a-z0-9_]{3,30}$' then p.username else lower(trim(p_username)) end;
  if v_username is null or v_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Choose a username with 3–30 letters, numbers or underscores' using errcode='PT422';
  end if;
  v_role := case a.professional_role when 'Choreographer' then 'choreographer'
    when 'Casting Director' then 'casting_director' when 'Casting Representative' then 'casting_director'
    when 'Creative Director' then 'creative_director' when 'Agent / Manager' then 'talent_representative'
    when 'Marketing' then 'brand_or_agency_professional' when 'Agency' then 'brand_or_agency_professional'
    when 'Producer' then 'producer' when 'Studio Owner' then 'studio_owner' else 'other' end;
  update public.profiles set
    first_name=coalesce(nullif(trim(first_name),''), split_part(trim(a.full_name),' ',1)),
    last_name=coalesce(nullif(trim(last_name),''), nullif(trim(substr(trim(a.full_name),length(split_part(trim(a.full_name),' ',1))+1)),'')),
    contact_email=coalesce(nullif(trim(contact_email),''),a.contact_email),
    username=v_username,
    onboarding_completed_at=coalesce(onboarding_completed_at,now()),
    active_shell='lookingForTalent',
    enabled_shells=case when 'lookingForTalent'=any(coalesce(enabled_shells,'{}')) then enabled_shells else array_append(coalesce(enabled_shells,'{}'),'lookingForTalent') end,
    updated_at=now()
  where user_id=v_uid;
  insert into public.non_talent_profiles(id,company_name,organization_name,organization_website,role,custom_role,work_email,work_types,custom_work_type,onboarding_completed,onboarding_step)
  values(v_uid,a.organization,a.organization,nullif(a.work_url,''),v_role,
    case when v_role='other' then a.professional_role end,a.contact_email,
    case when a.hiring_projects like 'Projects: %' then string_to_array(split_part(substr(a.hiring_projects,11),E'\nOther: ',1),'; ') end,
    case when position(E'\nOther: ' in a.hiring_projects)>0 then split_part(a.hiring_projects,E'\nOther: ',2)
      when a.hiring_projects not like 'Projects: %' then a.hiring_projects end,true,'success')
  on conflict(id) do update set
    company_name=coalesce(nullif(trim(non_talent_profiles.company_name),''),excluded.company_name),
    organization_name=coalesce(nullif(trim(non_talent_profiles.organization_name),''),excluded.organization_name),
    organization_website=coalesce(nullif(trim(non_talent_profiles.organization_website),''),excluded.organization_website),
    role=coalesce(nullif(non_talent_profiles.role,''),excluded.role),
    custom_role=case when nullif(non_talent_profiles.role,'') is null then excluded.custom_role else non_talent_profiles.custom_role end,
    work_email=coalesce(nullif(trim(non_talent_profiles.work_email),''),excluded.work_email),
    work_types=case when coalesce(cardinality(non_talent_profiles.work_types),0)=0 then excluded.work_types else non_talent_profiles.work_types end,
    custom_work_type=coalesce(nullif(non_talent_profiles.custom_work_type,''),excluded.custom_work_type),
    onboarding_completed=true,onboarding_step='success',updated_at=now();
  update public.industry_applications set intro_completed_at=coalesce(intro_completed_at,now()) where user_id=v_uid;
exception when unique_violation then
  raise exception 'That username is already taken. Choose another.' using errcode='PT409';
end;
$$;
revoke all on function public.complete_industry_approved_setup(text) from public,anon;
grant execute on function public.complete_industry_approved_setup(text) to authenticated;
