-- Hard cutover: Talent / Industry / Dual / Community Pro SKUs.
-- Legacy dancer/choreographer product IDs no longer grant Pro.

create or replace function public.effective_dancer_plan_tier(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sku text;
  plan_t text;
begin
  if p_user_id is null then
    return 'free';
  end if;

  select coalesce(app_store_product_id, polar_product_id)
    into sku
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
    and (
      s.current_period_end is null
      or s.current_period_end > (timezone('utc', now()) - interval '3 minutes')
    )
  order by s.updated_at desc
  limit 1;

  if sku is null then
    return 'free';
  elsif sku in (
    'com.motiion.talent.pro.monthly',
    'com.motiion.dual.pro.monthly',
    'com.motiion.community.pro.monthly'
  ) then
    return 'pro';
  end if;

  select sp.plan_tier
    into plan_t
  from public.subscription_products sp
  where sp.polar_product_id = sku
    and coalesce(sp.is_active, true)
  order by sp.sort_order nulls last
  limit 1;

  if plan_t is null then
    return 'free';
  end if;

  if lower(plan_t::text) = 'pro'
     or lower(coalesce(plan_t::text, '')) like '%pro%' then
    return 'pro';
  end if;

  return 'free';
end;
$$;

comment on function public.effective_dancer_plan_tier(uuid)
  is 'Talent/community portfolio + submission limits. Dual SKU grants talent Pro. Legacy dancer/choreographer SKUs do not.';

create or replace function public.effective_choreographer_plan_tier(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sku text;
begin
  if p_user_id is null then
    return 'free';
  end if;

  select coalesce(app_store_product_id, polar_product_id)
    into sku
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
    and (
      s.current_period_end is null
      or s.current_period_end > (timezone('utc', now()) - interval '3 minutes')
    )
  order by s.updated_at desc
  limit 1;

  if sku in (
    'com.motiion.industry.pro.monthly',
    'com.motiion.dual.pro.monthly'
  ) then
    return 'pro';
  end if;

  return 'free';
end;
$$;

comment on function public.effective_choreographer_plan_tier(uuid)
  is 'Industry casting publish limits. Dual SKU grants industry Pro. Legacy choreographer SKU no longer grants Pro (hard cutover).';

-- Aliases for clarity in newer call sites.
create or replace function public.effective_talent_plan_tier(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.effective_dancer_plan_tier(p_user_id);
$$;

create or replace function public.effective_industry_plan_tier(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.effective_choreographer_plan_tier(p_user_id);
$$;

revoke all on function public.effective_talent_plan_tier(uuid) from public;
revoke all on function public.effective_industry_plan_tier(uuid) from public;
grant execute on function public.effective_talent_plan_tier(uuid) to authenticated, service_role;
grant execute on function public.effective_industry_plan_tier(uuid) to authenticated, service_role;
