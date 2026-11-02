-- Reveal only company names to talent with an existing booking or sent deal memo.
create or replace function public.list_talent_booking_companies(p_user_ids uuid[])
returns table(user_id uuid, company_name text)
language sql stable security definer set search_path = ''
as $$
  select coalesce(n.id, p.id), coalesce(nullif(btrim(n.company_name), ''), nullif(btrim(p.company_name), ''))
  from public.non_talent_profiles n
  full join public.poster_profiles p on p.id = n.id
  where coalesce(n.id, p.id) = any(p_user_ids)
    and coalesce(nullif(btrim(n.company_name), ''), nullif(btrim(p.company_name), '')) is not null
    and (
      exists (select 1 from public.bookings b where b.industry_user_id = coalesce(n.id, p.id) and b.talent_user_id = auth.uid())
      or exists (select 1 from public.booking_deal_memos m where m.industry_user_id = coalesce(n.id, p.id) and m.talent_user_id = auth.uid() and m.status <> 'draft')
    );
$$;
revoke all on function public.list_talent_booking_companies(uuid[]) from public, anon;
grant execute on function public.list_talent_booking_companies(uuid[]) to authenticated;
