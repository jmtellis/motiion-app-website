-- projects, project_members, castings, casting_roles with RLS

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  production_company VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'collaborator',
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.castings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  password_hash TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  submission_deadline TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.casting_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_id UUID NOT NULL REFERENCES public.castings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  age_min INT,
  age_max INT,
  gender VARCHAR(40),
  ethnicity_preferences TEXT[],
  special_skills TEXT[],
  height_min_cm INT,
  height_max_cm INT,
  union_status VARCHAR(40),
  people_needed INT NOT NULL DEFAULT 1,
  match_filters JSONB
);

CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS castings_project_id_idx ON public.castings(project_id);
CREATE INDEX IF NOT EXISTS casting_roles_casting_id_idx ON public.casting_roles(casting_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.castings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.projects WHERE owner_id = uid
  UNION
  SELECT project_id FROM public.project_members WHERE user_id = uid;
$$;

CREATE POLICY projects_select_member ON public.projects
  FOR SELECT USING (id IN (SELECT public.user_project_ids(auth.uid())));

CREATE POLICY projects_insert_owner ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY projects_update_member ON public.projects
  FOR UPDATE USING (id IN (SELECT public.user_project_ids(auth.uid())));

CREATE POLICY projects_delete_owner ON public.projects
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY project_members_select ON public.project_members
  FOR SELECT USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

CREATE POLICY project_members_manage ON public.project_members
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY castings_select_member ON public.castings
  FOR SELECT USING (
    project_id IN (SELECT public.user_project_ids(auth.uid()))
    OR visibility IN ('public', 'unlisted')
  );

CREATE POLICY castings_write_member ON public.castings
  FOR ALL USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

CREATE POLICY casting_roles_select ON public.casting_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.castings c
      WHERE c.id = casting_id
        AND (
          c.project_id IN (SELECT public.user_project_ids(auth.uid()))
          OR c.visibility IN ('public', 'unlisted')
        )
    )
  );

CREATE POLICY casting_roles_write_member ON public.casting_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.castings c
      WHERE c.id = casting_id
        AND c.project_id IN (SELECT public.user_project_ids(auth.uid()))
    )
  );
