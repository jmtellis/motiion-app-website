-- Shared skip acknowledgements for deferred talent profile setup.
-- Mirrors iOS canonical migration 20260910010000_profiles_deferred_setup_skipped.sql

alter table public.profiles
  add column if not exists deferred_setup_skipped jsonb not null default '{}'::jsonb;

comment on column public.profiles.deferred_setup_skipped is
  'Optional deferred-setup skip acknowledgements (sizing, representation, unionStatus). Shared across iOS and web.';
