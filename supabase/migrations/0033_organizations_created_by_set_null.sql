-- Preserve shared organizations when the creating user is deleted.
-- Orgs can be shared via teams/team_members, so deleting the original creator
-- should not destroy the org. Make created_by nullable and switch the FK to
-- ON DELETE SET NULL so auth.users deletion succeeds and org data is retained.

ALTER TABLE public.organizations
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
