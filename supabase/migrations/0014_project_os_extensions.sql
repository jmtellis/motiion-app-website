-- Industry OS extensions: iOS poster_id projects, roster notes, role-scoped invites
-- Production projects use poster_id (not owner_id from web-only migration 0004).

-- 1. Table must exist before user_project_ids() references it
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Poster-only manage policy (no dependency on user_project_ids)
DROP POLICY IF EXISTS project_members_manage ON public.project_members;
CREATE POLICY project_members_manage ON public.project_members
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE poster_id = auth.uid()
    )
  );

-- 2. Function after project_members exists
CREATE OR REPLACE FUNCTION public.user_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.projects WHERE poster_id = uid
  UNION
  SELECT project_id FROM public.project_members WHERE user_id = uid;
$$;

-- Select policy depends on user_project_ids
DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

-- Role-scoped invitations (iOS casting roles, not web castings table)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS invitations_role_id_idx ON public.invitations(role_id);

-- Project-scoped rosters
ALTER TABLE public.talent_lists
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS talent_lists_project_id_idx ON public.talent_lists(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS talent_lists_one_project_roster_idx
  ON public.talent_lists(project_id)
  WHERE project_id IS NOT NULL AND kind = 'project_roster';

-- Member notes on roster entries
ALTER TABLE public.talent_list_members
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure activities can link to projects (column may already exist)
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS activities_project_id_idx ON public.activities(project_id);
