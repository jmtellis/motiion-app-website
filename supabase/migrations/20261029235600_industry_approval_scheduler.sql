-- Safe while unconfigured: this job does nothing until a server URL, Vault secret,
-- and at least one channel are explicitly enabled by the operator.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
alter table public.industry_approval_delivery_config add column worker_url text
 check(worker_url ~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/industry-approval-dispatch$');
create function public.dispatch_industry_approval_deliveries() returns void
language plpgsql security definer set search_path='' as $$
declare target text; dispatch_secret text;
begin
 select worker_url into target from public.industry_approval_delivery_config
 where singleton and (email_enabled or push_enabled);
 if target is null then return; end if;
 select decrypted_secret into dispatch_secret from vault.decrypted_secrets
 where name='industry_approval_dispatch_secret' limit 1;
 if nullif(dispatch_secret,'') is null then return; end if;
 perform net.http_post(url=>target,headers=>jsonb_build_object('Content-Type','application/json','x-notif-dispatch-secret',dispatch_secret),body=>'{}'::jsonb,timeout_milliseconds=>180000);
end;
$$;
revoke all on function public.dispatch_industry_approval_deliveries() from public,anon,authenticated;
select cron.schedule('industry-approval-delivery','* * * * *','select public.dispatch_industry_approval_deliveries()');
