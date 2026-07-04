-- professional_profiles, media_assets, credits with RLS + search indexes

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
  availability VARCHAR(40),
  represented BOOLEAN DEFAULT FALSE,
  agency_name VARCHAR(255),
  social_links JSONB,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
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

-- Search indexes
CREATE INDEX IF NOT EXISTS professional_profiles_location_city_idx ON public.professional_profiles(location_city);
CREATE INDEX IF NOT EXISTS professional_profiles_availability_idx ON public.professional_profiles(availability);
CREATE INDEX IF NOT EXISTS professional_profiles_union_status_idx ON public.professional_profiles(union_status);
CREATE INDEX IF NOT EXISTS professional_profiles_is_verified_idx ON public.professional_profiles(is_verified);
CREATE INDEX IF NOT EXISTS professional_profiles_styles_gin ON public.professional_profiles USING GIN (styles);
CREATE INDEX IF NOT EXISTS professional_profiles_skills_gin ON public.professional_profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS professional_profiles_ethnicity_gin ON public.professional_profiles USING GIN (ethnicity);
CREATE INDEX IF NOT EXISTS professional_profiles_search_vector_gin ON public.professional_profiles USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS media_assets_profile_id_idx ON public.media_assets(profile_id);
CREATE INDEX IF NOT EXISTS credits_profile_id_idx ON public.credits(profile_id);

-- Maintain search_vector on write
CREATE OR REPLACE FUNCTION public.professional_profiles_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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

CREATE POLICY professional_profiles_select_verified ON public.professional_profiles
  FOR SELECT USING (is_verified = TRUE OR auth.uid() = user_id);

CREATE POLICY professional_profiles_insert_own ON public.professional_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY professional_profiles_update_own ON public.professional_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY media_assets_select ON public.media_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = profile_id AND (pp.is_verified = TRUE OR pp.user_id = auth.uid())
    )
  );

CREATE POLICY media_assets_write_own ON public.media_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = profile_id AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY credits_select ON public.credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = profile_id AND (pp.is_verified = TRUE OR pp.user_id = auth.uid())
    )
  );

CREATE POLICY credits_write_own ON public.credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = profile_id AND pp.user_id = auth.uid()
    )
  );
