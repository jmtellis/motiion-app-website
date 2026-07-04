-- Organizations, teams, team_members with RLS

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'production_company',
  website TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS teams_organization_id_idx ON public.teams(organization_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Org members: users who belong to any team in the org
CREATE OR REPLACE FUNCTION public.user_org_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.organization_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = uid;
$$;

CREATE POLICY orgs_select_member ON public.organizations
  FOR SELECT USING (id IN (SELECT public.user_org_ids(auth.uid())) OR created_by = auth.uid());

CREATE POLICY orgs_insert_authenticated ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY orgs_update_creator ON public.organizations
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY teams_select_member ON public.teams
  FOR SELECT USING (organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY teams_insert_member ON public.teams
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY team_members_select ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY team_members_insert ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
    OR user_id = auth.uid()
  );

-- Link non_talent_profiles to organizations (nullable FK added after orgs exist)
ALTER TABLE public.non_talent_profiles
  DROP CONSTRAINT IF EXISTS non_talent_profiles_organization_id_fkey;

ALTER TABLE public.non_talent_profiles
  ADD CONSTRAINT non_talent_profiles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
