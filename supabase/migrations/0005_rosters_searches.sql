-- talent_lists, talent_list_members, saved_searches with owner-scoped RLS

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

CREATE INDEX IF NOT EXISTS talent_lists_owner_id_idx ON public.talent_lists(owner_id);
CREATE INDEX IF NOT EXISTS talent_list_members_profile_id_idx ON public.talent_list_members(profile_id);
CREATE INDEX IF NOT EXISTS saved_searches_owner_id_idx ON public.saved_searches(owner_id);

ALTER TABLE public.talent_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY talent_lists_owner ON public.talent_lists
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY talent_list_members_owner ON public.talent_list_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.talent_lists tl
      WHERE tl.id = list_id AND tl.owner_id = auth.uid()
    )
  );

CREATE POLICY saved_searches_owner ON public.saved_searches
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
