-- Web MVP additive tables (reconciled with existing iOS Supabase schema)
-- Skips: profiles, non_talent_profiles, projects, roles, activities, messages,
-- notifications, subscriptions, analytics_events, enrollments (already exist).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organizations / teams
-- ---------------------------------------------------------------------------
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

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_org_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT t.organization_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = uid;
$$;

DROP POLICY IF EXISTS orgs_select_member ON public.organizations;
CREATE POLICY orgs_select_member ON public.organizations
  FOR SELECT USING (id IN (SELECT public.user_org_ids(auth.uid())) OR created_by = auth.uid());

DROP POLICY IF EXISTS orgs_insert_authenticated ON public.organizations;
CREATE POLICY orgs_insert_authenticated ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- Professional profiles (web matching + verification)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug VARCHAR(120) UNIQUE NOT NULL,
  subtype VARCHAR(30) NOT NULL DEFAULT 'dancer',
  bio TEXT,
  location_city VARCHAR(120),
  location_region VARCHAR(120),
  pronouns VARCHAR(40),
  gender VARCHAR(40),
  ethnicity TEXT[],
  height_cm INT,
  eye_color VARCHAR(40),
  hair_color VARCHAR(40),
  styles TEXT[],
  skills TEXT[],
  union_status VARCHAR(40),
  availability VARCHAR(40) DEFAULT 'available',
  represented BOOLEAN DEFAULT FALSE,
  agency_name VARCHAR(255),
  social_links JSONB,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  search_vector TSVECTOR,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  company VARCHAR(255),
  category VARCHAR(80),
  year INT,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS professional_profiles_location_city_idx ON public.professional_profiles(location_city);
CREATE INDEX IF NOT EXISTS professional_profiles_is_verified_idx ON public.professional_profiles(is_verified);
CREATE INDEX IF NOT EXISTS professional_profiles_styles_gin ON public.professional_profiles USING GIN (styles);
CREATE INDEX IF NOT EXISTS professional_profiles_skills_gin ON public.professional_profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS professional_profiles_search_vector_gin ON public.professional_profiles USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.professional_profiles_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.styles, ' '), '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.skills, ' '), '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'C');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS professional_profiles_search_vector_trigger ON public.professional_profiles;
CREATE TRIGGER professional_profiles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.professional_profiles_search_vector_update();

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_profiles_select_verified ON public.professional_profiles;
CREATE POLICY professional_profiles_select_verified ON public.professional_profiles
  FOR SELECT USING (is_verified = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS professional_profiles_insert_own ON public.professional_profiles;
CREATE POLICY professional_profiles_insert_own ON public.professional_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS professional_profiles_update_own ON public.professional_profiles;
CREATE POLICY professional_profiles_update_own ON public.professional_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Web rosters + saved searches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(30) NOT NULL DEFAULT 'roster',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.talent_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.talent_lists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.talent_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS talent_lists_owner ON public.talent_lists;
CREATE POLICY talent_lists_owner ON public.talent_lists
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS talent_list_members_owner ON public.talent_list_members;
CREATE POLICY talent_list_members_owner ON public.talent_list_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.talent_lists tl WHERE tl.id = list_id AND tl.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS saved_searches_owner ON public.saved_searches;
CREATE POLICY saved_searches_owner ON public.saved_searches
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Castings (child of existing projects) + invitations
-- ---------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  casting_id UUID REFERENCES public.castings(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  kind VARCHAR(30) NOT NULL DEFAULT 'casting',
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_casting_profile_unique
  ON public.invitations (casting_id, invited_profile_id)
  WHERE casting_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS invitations_invited_profile_idx
  ON public.invitations (invited_profile_id, project_id, status);

ALTER TABLE public.castings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.projects WHERE poster_id = uid;
$$;

DROP POLICY IF EXISTS castings_select ON public.castings;
CREATE POLICY castings_select ON public.castings
  FOR SELECT USING (
    project_id IN (SELECT public.user_project_ids(auth.uid()))
    OR visibility IN ('public', 'unlisted')
  );

DROP POLICY IF EXISTS castings_write ON public.castings;
CREATE POLICY castings_write ON public.castings
  FOR ALL USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

DROP POLICY IF EXISTS invitations_rw ON public.invitations;
CREATE POLICY invitations_rw ON public.invitations
  FOR ALL USING (
    project_id IN (SELECT public.user_project_ids(auth.uid()))
    OR invited_profile_id IN (SELECT id FROM public.professional_profiles WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Project-scoped messaging threads (parallel to legacy conversations)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  casting_id UUID REFERENCES public.castings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thread_participants (
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  kind VARCHAR(40),
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_thread_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT thread_id FROM public.thread_participants WHERE user_id = uid;
$$;

DROP POLICY IF EXISTS message_threads_participant ON public.message_threads;
CREATE POLICY message_threads_participant ON public.message_threads
  FOR SELECT USING (id IN (SELECT public.user_thread_ids(auth.uid())));

-- Stripe webhook dedupe (subscriptions table already exists for iOS/Polar)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
