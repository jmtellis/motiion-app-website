-- Baseline: profiles + non_talent_profiles (reconciled with src/types/database.ts and iOS app)
-- Idempotent for existing Supabase projects.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (one row per auth user; talent + industry share this table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  display_name VARCHAR(255),
  username VARCHAR(60) UNIQUE,
  account_type VARCHAR(30) NOT NULL DEFAULT 'talent',
  talent_types TEXT[],
  headshot_urls TEXT[],
  headshot_original_urls TEXT[],
  onboarding_completed_at TIMESTAMPTZ,
  date_of_birth DATE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  resume_url TEXT,
  height TEXT,
  ethnicity TEXT[],
  hair_color VARCHAR(40),
  eye_color VARCHAR(40),
  gender VARCHAR(40),
  sizing JSONB,
  working_locations JSONB,
  representation TEXT,
  union_status VARCHAR(40),
  union_member_id VARCHAR(80),
  agent JSONB,
  additional_representations JSONB,
  experiences JSONB,
  training JSONB,
  styles TEXT[],
  skills TEXT[],
  profile_highlights JSONB,
  profile_visuals JSONB,
  instagram_url TEXT,
  x_url TEXT,
  tiktok_url TEXT,
  whatsapp_url TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_account_type_idx ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS profiles_onboarding_idx ON public.profiles(onboarding_completed_at);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT USING (
    onboarding_completed_at IS NOT NULL
    AND account_type = 'talent'
  );

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- non_talent_profiles (industry extension; id mirrors auth.users.id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.non_talent_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  work_email VARCHAR(255),
  company_name VARCHAR(255),
  non_talent_type VARCHAR(50),
  user_type VARCHAR(50),
  primary_goal VARCHAR(80),
  role VARCHAR(80),
  organization_name VARCHAR(255),
  organization_website TEXT,
  company_size VARCHAR(50),
  talent_types TEXT[],
  style_focus TEXT[],
  markets TEXT[],
  verification_links JSONB,
  notification_preferences JSONB,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  organization_id UUID
);

ALTER TABLE public.non_talent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY non_talent_select_own ON public.non_talent_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY non_talent_insert_own ON public.non_talent_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY non_talent_update_own ON public.non_talent_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Search-compatible view over onboarded talent profiles (iOS `talent` table parity)
CREATE OR REPLACE VIEW public.talent AS
SELECT
  p.user_id AS id,
  p.username,
  COALESCE(p.display_name, NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), '')) AS full_name,
  (p.headshot_urls[1]) AS headshot_url,
  p.headshot_urls,
  p.gender,
  p.ethnicity,
  p.height,
  p.talent_types,
  p.styles,
  p.skills,
  p.representation,
  NULL::TEXT AS location,
  p.union_status,
  p.eye_color,
  p.hair_color,
  p.profile_highlights,
  NULL::TEXT AS bio,
  NULL::TEXT AS agency_logo_url,
  FALSE AS is_verified
FROM public.profiles p
WHERE p.account_type = 'talent'
  AND p.onboarding_completed_at IS NOT NULL;

GRANT SELECT ON public.talent TO anon, authenticated;
