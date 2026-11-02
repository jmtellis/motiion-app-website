DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  poster_id uuid,
  title text,
  start_date date,
  end_date date,
  project_details jsonb,
  casting_configuration jsonb
);

CREATE TABLE public.project_members (
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL
);

CREATE OR REPLACE FUNCTION public.is_project_operator(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_user_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id AND p.poster_id = p_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p_project_id
        AND pm.user_id = p_user_id
        AND pm.role = 'admin'
    )
  );
$$;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  talent_user_id uuid NOT NULL,
  industry_user_id uuid NOT NULL,
  role_id uuid,
  availability_check_request_id uuid,
  status text NOT NULL,
  date_ranges jsonb,
  timezone text,
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL CONSTRAINT booking_events_action_check CHECK (
    action = ANY (ARRAY[
      'status_changed'::text,
      'confirmation_requested'::text
    ])
  ),
  from_status text,
  to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_confirmation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  talent_id uuid NOT NULL,
  booking_id uuid,
  role_id uuid,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
);

CREATE OR REPLACE FUNCTION public.booking_append_event(
  p_booking_id uuid,
  p_actor_user_id uuid,
  p_actor_role text,
  p_action text,
  p_from_status text DEFAULT NULL,
  p_to_status text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.booking_events (
    booking_id, actor_user_id, actor_role, action, from_status, to_status, payload
  ) VALUES (
    p_booking_id, p_actor_user_id, coalesce(p_actor_role, 'system'), p_action,
    p_from_status, p_to_status, coalesce(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
