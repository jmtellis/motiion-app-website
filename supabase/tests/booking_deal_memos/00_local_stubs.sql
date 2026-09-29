-- Local-only stubs for Supabase auth + the prod tables the MOT-94 migration references.
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table if not exists auth.users (id uuid primary key default gen_random_uuid());
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled_shells text[] not null default '{talent}'
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  enabled_modules jsonb not null default '{"casting": true}'
);
create table public.availability_check_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  talent_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'pending',
  response_kind text
);
