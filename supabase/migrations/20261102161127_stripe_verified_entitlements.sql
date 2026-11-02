-- Web subscriptions must participate in the same trusted, plan-specific access
-- contract as the iOS client. Existing rows are not implicitly verified/backfilled.
alter table public.subscriptions add column if not exists plan_entitlement text;
comment on column public.subscriptions.plan_entitlement is 'Server-verified Stripe plan. Null on legacy/unverified records. Apple plans continue to use app_store_product_id.';

create or replace function public.account_pro_status(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  sku text;
  industry_stripe boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('talent', false, 'industry', false, 'community', false);
  end if;
  sku := public.trusted_apple_iap_product_id(p_user_id);
  select exists(select 1 from public.subscriptions s
    where s.user_id = p_user_id and s.provider = 'stripe' and s.billing_source = 'stripe'
      and s.provider_verified and s.plan_entitlement = 'industry_pro'
      and s.status in ('active','trialing') and s.current_period_end > now()
  ) into industry_stripe;
  return jsonb_build_object(
    'talent', coalesce(sku in ('com.motiion.talent.pro.monthly','com.motiion.dual.pro.monthly','com.motiion.dancer.pro.monthly','com.motiion.dancer.pro.yearly'), false)
      or public.user_has_active_plan_grant(p_user_id, 'talent_pro'),
    'industry', coalesce(sku in ('com.motiion.industry.pro.monthly','com.motiion.dual.pro.monthly','com.motiion.choreographer.pro.monthly'), false)
      or industry_stripe or public.user_has_active_plan_grant(p_user_id, 'industry_pro'),
    'community', coalesce(sku = 'com.motiion.community.pro.monthly', false)
      or public.user_has_active_plan_grant(p_user_id, 'community_pro')
  );
end;
$$;

-- Only the signed webhook/reconciliation server can write provider proof.
-- Serialize events for a user so late cancellation of an older subscription
-- cannot revoke a replacement, and duplicate deliveries remain idempotent.
create or replace function public.sync_verified_stripe_subscription(
  p_user_id uuid, p_subscription_id text, p_customer_id text,
  p_status text, p_period_end timestamptz, p_event_id text, p_event_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare previous public.subscriptions%rowtype;
begin
  if p_user_id is null or p_subscription_id not like 'sub_%' or p_customer_id not like 'cus_%'
    or p_status not in ('active','trialing','canceled','past_due','incomplete','incomplete_expired','unpaid')
    or p_event_id is null or p_event_at is null then
    raise exception 'Invalid verified subscription payload' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 91240));
  if exists(select 1 from public.stripe_webhook_events where id=p_event_id) then return false; end if;
  select * into previous from public.subscriptions where user_id=p_user_id and provider='stripe' for update;
  if found and (
    previous.provider_event_at > p_event_at
    or (previous.external_id <> p_subscription_id and previous.status in ('active','trialing') and p_status not in ('active','trialing'))
  ) then
    insert into public.stripe_webhook_events(id) values(p_event_id) on conflict do nothing;
    return false;
  end if;
  insert into public.subscriptions(user_id,provider,billing_source,external_id,customer_id,status,tier,
    current_period_end,provider_verified,plan_entitlement,provider_event_id,provider_event_at,updated_at)
  values(p_user_id,'stripe','stripe',p_subscription_id,p_customer_id,p_status,
    case when p_status in ('active','trialing') then 'pro' else 'free' end,
    p_period_end,true,'industry_pro',p_event_id,p_event_at,now())
  on conflict(user_id,provider) do update set billing_source='stripe', external_id=excluded.external_id,
    customer_id=excluded.customer_id,status=excluded.status,tier=excluded.tier,
    current_period_end=excluded.current_period_end,provider_verified=true,plan_entitlement='industry_pro',
    provider_event_id=excluded.provider_event_id,provider_event_at=excluded.provider_event_at,updated_at=now();
  insert into public.stripe_webhook_events(id) values(p_event_id) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.sync_verified_stripe_subscription(uuid,text,text,text,timestamptz,text,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_verified_stripe_subscription(uuid,text,text,text,timestamptz,text,timestamptz) to service_role;

-- One server-owned Stripe customer mapping per account, including users who
-- abandon checkout before their first subscription webhook arrives.
create table if not exists public.stripe_customer_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.stripe_customer_links enable row level security;
revoke all on public.stripe_customer_links from anon, authenticated;
grant select, insert, update, delete on public.stripe_customer_links to service_role;
