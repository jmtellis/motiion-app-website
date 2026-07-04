-- activities, activity_rsvps, invitations (activities before invitations FK)

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id),
  kind VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  price_cents INT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- iOS legacy columns for shared backend compatibility
  creator_id UUID REFERENCES auth.users(id),
  type VARCHAR(50),
  activity_date DATE,
  start_time TIME,
  cover_image_url TEXT,
  status VARCHAR(30) DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS public.activity_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, user_id)
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

CREATE INDEX IF NOT EXISTS activities_organizer_id_idx ON public.activities(organizer_id);
CREATE INDEX IF NOT EXISTS activities_project_id_idx ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS activity_rsvps_activity_id_idx ON public.activity_rsvps(activity_id);
CREATE INDEX IF NOT EXISTS invitations_invited_profile_idx ON public.invitations(invited_profile_id, project_id, status);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_select ON public.activities
  FOR SELECT USING (
    visibility IN ('public', 'unlisted')
    OR organizer_id = auth.uid()
    OR creator_id = auth.uid()
    OR project_id IN (SELECT public.user_project_ids(auth.uid()))
  );

CREATE POLICY activities_write ON public.activities
  FOR ALL USING (organizer_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY activity_rsvps_own ON public.activity_rsvps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY activity_rsvps_organizer_read ON public.activity_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_id AND (a.organizer_id = auth.uid() OR a.creator_id = auth.uid())
    )
  );

CREATE POLICY invitations_project_member ON public.invitations
  FOR SELECT USING (
    project_id IN (SELECT public.user_project_ids(auth.uid()))
    OR invited_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY invitations_project_write ON public.invitations
  FOR ALL USING (project_id IN (SELECT public.user_project_ids(auth.uid())));

-- iOS enrollments table (referenced by home feed)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'enrolled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, student_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollments_select_own ON public.enrollments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY enrollments_insert_own ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);
