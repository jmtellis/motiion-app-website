-- Shared iOS/web identity results belong to trusted Stripe handlers, separately
-- from email confirmation, application review, plan entitlements and fee counters.
-- No existing account state or access policy is changed by this migration.
-- SECURITY INVOKER preserves the caller role: ordinary profile saves must not
-- grant, revoke or replace identity, while service-role webhook writes still work.
create or replace function public.protect_profile_identity_result()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.identity_verification_status := 'unverified';
    new.stripe_identity_verification_session_id := null;
    new.identity_verified_at := null;
  else
    new.identity_verification_status := old.identity_verification_status;
    new.stripe_identity_verification_session_id := old.stripe_identity_verification_session_id;
    new.identity_verified_at := old.identity_verified_at;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_profile_identity_result() from public, anon, authenticated;
drop trigger if exists profiles_protect_identity_result on public.profiles;
create trigger profiles_protect_identity_result
before insert or update on public.profiles
for each row execute function public.protect_profile_identity_result();
