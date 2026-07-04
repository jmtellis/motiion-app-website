-- analytics_events (matches src/lib/analytics/types.ts)

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  platform VARCHAR(10) NOT NULL DEFAULT 'web',
  event_name VARCHAR(80) NOT NULL,
  properties JSONB DEFAULT '{}',
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON public.analytics_events(user_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own events; admins read via service role
CREATE POLICY analytics_events_insert ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY analytics_events_select_own ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);
