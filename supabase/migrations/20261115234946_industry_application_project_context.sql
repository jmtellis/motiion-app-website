-- Optional plan-fit context, distinct from application approval and project types.
alter table public.industry_applications
  add column concurrent_projects text check (concurrent_projects in ('1','2_3','4_5','6_plus','not_sure')),
  add column project_frequency text check (project_frequency in ('one_off','occasional','ongoing','not_sure')),
  add column management_team_size text check (management_team_size in ('1','2_3','4_10','11_plus','not_sure'));

-- Preserve the old endpoint for existing clients. This wrapper keeps identity,
-- authorization, conflict handling and context updates in one transaction.
create function public.submit_industry_application_with_context(
 p_full_name text, p_professional_role text, p_organization text,
 p_contact_email text, p_work_url text, p_hiring_projects text,
 p_expected_version integer, p_username text, p_date_of_birth date,
 p_avatar_url text, p_acquisition_source text,
 p_acquisition_source_detail text default null,
 p_concurrent_projects text default null,
 p_project_frequency text default null,
 p_management_team_size text default null
) returns public.industry_applications
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_application public.industry_applications;
begin
 if v_uid is null then raise exception 'Sign in to apply.' using errcode='42501'; end if;
 if (p_concurrent_projects is not null and p_concurrent_projects not in ('1','2_3','4_5','6_plus','not_sure'))
 or (p_project_frequency is not null and p_project_frequency not in ('one_off','occasional','ongoing','not_sure'))
 or (p_management_team_size is not null and p_management_team_size not in ('1','2_3','4_10','11_plus','not_sure')) then
   raise exception 'Choose valid answers for your typical workload.' using errcode='22023';
 end if;
 v_application := public.submit_industry_application_with_identity(
 p_full_name,p_professional_role,p_organization,p_contact_email,p_work_url,p_hiring_projects,
 p_expected_version,p_username,p_date_of_birth,p_avatar_url,p_acquisition_source,p_acquisition_source_detail);
 update public.industry_applications set concurrent_projects=p_concurrent_projects,
 project_frequency=p_project_frequency, management_team_size=p_management_team_size
 where user_id=v_uid returning * into v_application;
 return v_application;
end;
$$;
revoke all on function public.submit_industry_application_with_context(text,text,text,text,text,text,integer,text,date,text,text,text,text,text,text) from public,anon;
grant execute on function public.submit_industry_application_with_context(text,text,text,text,text,text,integer,text,date,text,text,text,text,text,text) to authenticated;
