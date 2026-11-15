create or replace function public.update_project_team_occurrence(p_project_id uuid,p_category_id uuid,p_day text,p_date date,p_start time,p_end time,p_location text) returns void language plpgsql security definer set search_path='' as $$
declare p public.projects; cats jsonb; item jsonb; updated jsonb:='[]'; newday text:=p_date::text; key text; found_item boolean:=false;
begin
 if public.project_team_role(p_project_id) is null then raise exception 'Project team access required.' using errcode='42501'; end if;
 if p_date is null or length(p_location)>500 then raise exception 'Check the date and location.'; end if;
 perform project_billing.require_paid_project(p_project_id);
 select * into p from public.projects where id=p_project_id for update;
 cats:=coalesce(p.project_details->'schedule_categories',p.casting_configuration->'schedule_categories','[]'::jsonb);
 for item in select value from jsonb_array_elements(cats) loop
  if lower(item->>'id_key')=p_category_id::text and (item->'selected_days_yyyymmdd') ? p_day then
   found_item:=true;
   if p_day<>newday and (item->'selected_days_yyyymmdd') ? newday then raise exception 'This schedule item already has that date.'; end if;
   item:=jsonb_set(item,'{selected_days_yyyymmdd}',(select jsonb_agg(case when value=p_day then newday else value end) from jsonb_array_elements_text(item->'selected_days_yyyymmdd')));
   foreach key in array array['start_time_by_day','end_time_by_day','location_by_day','applies_to_group_ids_by_day'] loop
    if p_day<>newday and (item->key) ? p_day then item:=jsonb_set(item,array[key],((item->key)-p_day)||jsonb_build_object(newday,item->key->p_day)); end if;
   end loop;
   item:=jsonb_set(item,'{start_time_by_day}',(coalesce(item->'start_time_by_day','{}')-newday)||case when p_start is null then '{}'::jsonb else jsonb_build_object(newday,to_char(p_start,'HH24:MI:SS')) end);
   item:=jsonb_set(item,'{end_time_by_day}',(coalesce(item->'end_time_by_day','{}')-newday)||case when p_end is null then '{}'::jsonb else jsonb_build_object(newday,to_char(p_end,'HH24:MI:SS')) end);
   item:=jsonb_set(item,'{location_by_day}',(coalesce(item->'location_by_day','{}')-newday)||case when nullif(trim(p_location),'') is null then '{}'::jsonb else jsonb_build_object(newday,trim(p_location)) end);
  end if;
  updated:=updated||jsonb_build_array(item);
 end loop;
 if not found_item then raise exception 'Schedule changed. Refresh and try again.'; end if;
 update public.projects set project_details=case when project_details is null then null else jsonb_set(project_details,'{schedule_categories}',updated) end,casting_configuration=jsonb_set(coalesce(casting_configuration,'{}'),'{schedule_categories}',updated) where id=p_project_id;
end $$;
revoke all on function public.update_project_team_occurrence(uuid,uuid,text,date,time,time,text) from public,anon;
grant execute on function public.update_project_team_occurrence(uuid,uuid,text,date,time,time,text) to authenticated;

