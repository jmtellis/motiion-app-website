begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111101');
insert into public.profiles(user_id,active_shell) values ('11111111-1111-4111-8111-111111111101','industry');
select public.sync_project_purchase('11111111-1111-4111-8111-111111111101','stripe','sub_test_capacity','studio','active',now()+interval '30 days',now());
insert into public.projects(id,poster_id,title,is_active) values ('11111111-1111-4111-8111-111111111102','11111111-1111-4111-8111-111111111101','Capacity test',true);
do $$ begin
 begin
 insert into public.projects(id,poster_id,title,is_active) values ('11111111-1111-4111-8111-111111111103','11111111-1111-4111-8111-111111111101','Should fail',true);
 raise exception 'TEST FAILED: second Studio project accepted' using errcode='XX000';
 exception when sqlstate 'P0001' then null; end;
end $$;
select public.sync_project_purchase('11111111-1111-4111-8111-111111111101','stripe','pi_test_pass','project_pass','active',null,now());
insert into public.projects(id,poster_id,title,is_active) values ('11111111-1111-4111-8111-111111111103','11111111-1111-4111-8111-111111111101','Pass project',true);
do $$ begin
 if not exists(select 1 from public.project_purchases where external_id='pi_test_pass' and project_id='11111111-1111-4111-8111-111111111103' and expires_at>now()+interval '89 days') then raise exception 'TEST FAILED: pass not assigned'; end if;
end $$;
update public.projects set is_active=false where id='11111111-1111-4111-8111-111111111102';
insert into public.projects(id,poster_id,title,is_active) values ('11111111-1111-4111-8111-111111111104','11111111-1111-4111-8111-111111111101','Reused monthly slot',true);
-- Revocation survives duplicate fulfillment and stale events.
select public.sync_project_purchase('11111111-1111-4111-8111-111111111101','stripe','pi_test_pass','project_pass','revoked',null,now()+interval '1 second');
select public.sync_project_purchase('11111111-1111-4111-8111-111111111101','stripe','pi_test_pass','project_pass','active',null,now()+interval '2 seconds');
do $$ begin
 if (select status from public.project_purchases where external_id='pi_test_pass')<>'revoked' then raise exception 'Refund was undone'; end if;
end $$;
-- Production House has exactly five monthly slots, including prior active projects.
select public.sync_project_purchase('11111111-1111-4111-8111-111111111101','stripe','sub_test_capacity','production_house','active',now()+interval '30 days',now()+interval '3 seconds');
insert into public.projects(poster_id,title,is_active) select '11111111-1111-4111-8111-111111111101','House test',true from generate_series(1,3);
do $$ begin
 begin
 insert into public.projects(poster_id,title,is_active) values ('11111111-1111-4111-8111-111111111101','Sixth project',true);
 raise exception 'Sixth project incorrectly allowed' using errcode='XX000';
 exception when sqlstate 'P0001' then null; end;
end $$;
select 'Studio and Production House limits, pass activation, overflow, slot reuse, and sticky refunds passed' as result;
rollback;
