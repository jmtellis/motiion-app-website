-- Application review is authorization, independent of sign-in and paid plans.
-- No existing account is approved or deleted by this migration.
CREATE TABLE public.industry_applications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  professional_role text NOT NULL,
  organization text NOT NULL,
  contact_email text NOT NULL,
  work_url text NOT NULL,
  hiring_projects text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','needs_information','rejected','approved')),
  version integer NOT NULL DEFAULT 1,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.industry_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.industry_applications FROM anon, authenticated;
GRANT SELECT ON public.industry_applications TO authenticated;
CREATE POLICY industry_application_read ON public.industry_applications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.auth_is_platform_admin());
CREATE TABLE public.industry_application_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  decision text NOT NULL,
  feedback text,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  application_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.industry_application_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.industry_application_reviews FROM anon, authenticated;
GRANT SELECT ON public.industry_application_reviews TO authenticated;
CREATE POLICY industry_application_reviews_admin ON public.industry_application_reviews FOR SELECT TO authenticated
  USING (public.auth_is_platform_admin());

-- Explicit transition exceptions are separate from submitted/reviewed applications.
-- Empty by default; only trusted database administration can grant or revoke access.
CREATE TABLE public.industry_legacy_access_grants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  authorization_reference text NOT NULL CHECK (length(btrim(authorization_reference)) > 0),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL DEFAULT current_user,
  revoked_at timestamptz,
  revocation_reason text,
  CHECK (revoked_at IS NULL OR length(btrim(coalesce(revocation_reason,''))) > 0)
);
ALTER TABLE public.industry_legacy_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.industry_legacy_access_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.industry_legacy_access_grants TO authenticated;
CREATE POLICY industry_legacy_access_read ON public.industry_legacy_access_grants FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.auth_is_platform_admin());

CREATE OR REPLACE FUNCTION public.has_industry_approval(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user_id IS NOT NULL AND ((p_user_id=auth.uid() AND public.auth_is_platform_admin()) OR EXISTS (
    SELECT 1 FROM public.industry_applications a WHERE a.user_id=p_user_id AND a.status='approved'
  ) OR EXISTS (
    SELECT 1 FROM public.industry_legacy_access_grants g WHERE g.user_id=p_user_id AND g.revoked_at IS NULL
  ));
$$;
REVOKE ALL ON FUNCTION public.has_industry_approval(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_industry_approval(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_industry_application(
  p_full_name text, p_professional_role text, p_organization text,
  p_contact_email text, p_work_url text, p_hiring_projects text, p_expected_version integer DEFAULT 0
) RETURNS public.industry_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.industry_applications;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to apply.' USING ERRCODE='42501'; END IF;
  -- Serialize first submission as well as edits and staff decisions.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 2841));
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id=v_uid AND account_type='community') THEN
    RAISE EXCEPTION 'Community accounts cannot add an industry profile.' USING ERRCODE='42501';
  END IF;
  IF length(btrim(coalesce(p_full_name,''))) NOT BETWEEN 1 AND 200
    OR length(btrim(coalesce(p_professional_role,''))) NOT BETWEEN 1 AND 200
    OR length(btrim(coalesce(p_organization,''))) NOT BETWEEN 1 AND 200
    OR length(btrim(coalesce(p_hiring_projects,''))) NOT BETWEEN 10 AND 3000
    OR length(coalesce(p_contact_email,'')) > 320
    OR coalesce(p_contact_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR coalesce(p_work_url,'') ~ '^https?://[^/]*@'
    OR length(coalesce(p_work_url,'')) > 2000
    OR coalesce(p_work_url,'') !~ '^https?://[^[:space:]/]+\.[^[:space:]/]+(/[^[:space:]]*)?$'
  THEN RAISE EXCEPTION 'Add your name, role, company or Independent, email, work link, and a brief description of your projects.' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_row FROM public.industry_applications WHERE user_id=v_uid FOR UPDATE;
  IF FOUND THEN
    IF v_row.status='approved' THEN RAISE EXCEPTION 'Your industry access is already approved.'; END IF;
    IF v_row.version IS DISTINCT FROM p_expected_version THEN
      RAISE EXCEPTION 'Your application changed. Refresh before saving.' USING ERRCODE='40001';
    END IF;
  ELSIF p_expected_version <> 0 THEN
    RAISE EXCEPTION 'Your application changed. Refresh before saving.' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.industry_applications(user_id,full_name,professional_role,organization,contact_email,work_url,hiring_projects)
  VALUES(v_uid,btrim(p_full_name),btrim(p_professional_role),btrim(p_organization),lower(btrim(p_contact_email)),btrim(p_work_url),btrim(p_hiring_projects))
  ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,professional_role=excluded.professional_role,
    organization=excluded.organization,contact_email=excluded.contact_email,work_url=excluded.work_url,hiring_projects=excluded.hiring_projects,
    status='pending',version=industry_applications.version+1,submitted_at=now(),reviewed_at=NULL,reviewed_by=NULL
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_industry_application(text,text,text,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_industry_application(text,text,text,text,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_industry_application(p_user_id uuid,p_version integer,p_decision text,p_feedback text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.industry_applications;
BEGIN
  IF auth.uid() IS NULL OR NOT public.auth_is_platform_admin() THEN
    RAISE EXCEPTION 'Only Motiion staff can review applications.' USING ERRCODE='42501';
  END IF;
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'Another staff member must review your application.' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('approved','needs_information','rejected') OR p_decision IS NULL THEN RAISE EXCEPTION 'Invalid review decision.'; END IF;
  IF p_decision <> 'approved' AND length(btrim(coalesce(p_feedback,'')))=0 THEN RAISE EXCEPTION 'Add feedback for the applicant.'; END IF;
  IF length(coalesce(p_feedback,''))>3000 THEN RAISE EXCEPTION 'Keep feedback under 3000 characters.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 2841));
  SELECT * INTO v_row FROM public.industry_applications WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND OR v_row.status <> 'pending' OR v_row.version IS DISTINCT FROM p_version THEN
    RAISE EXCEPTION 'This application changed. Refresh the queue before reviewing.' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.industry_application_reviews(user_id,version,decision,feedback,reviewer_id,application_snapshot)
    VALUES(p_user_id,p_version,p_decision,nullif(btrim(p_feedback),''),auth.uid(),to_jsonb(v_row));
  UPDATE public.industry_applications SET status=p_decision,feedback=nullif(btrim(p_feedback),''),reviewed_at=now(),reviewed_by=auth.uid()
    WHERE user_id=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.review_industry_application(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_industry_application(uuid,integer,text,text) TO authenticated;

-- Guard mutations even when an older client or SECURITY DEFINER RPC bypasses RLS.
-- Talent submissions/responses and event attendance are deliberately not gated.
CREATE OR REPLACE FUNCTION public.guard_industry_approval_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_industry_approval(auth.uid()) AND NOT public.auth_is_platform_admin() THEN
    RAISE EXCEPTION 'Your industry application must be approved before using professional features.' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_industry_approval_write() FROM PUBLIC,anon,authenticated;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles','castings','casting_roles','casting_shortlist_shares','rosters','roster_members','talent_rosters','talent_roster_members'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('CREATE TRIGGER industry_approval_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_industry_approval_write()',t);
    END IF;
  END LOOP;
END;
$$;

-- Project creation/updates cannot be used to publish a casting via a legacy client.
CREATE OR REPLACE FUNCTION public.guard_industry_project_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb;
BEGIN
  row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF auth.uid() IS NOT NULL AND NOT public.has_industry_approval(auth.uid()) AND NOT public.auth_is_platform_admin()
     AND (coalesce(row_data->>'project_type','') IN ('casting','job') OR coalesce((row_data->>'is_composable')::boolean,false)
       OR (TG_OP='UPDATE' AND (to_jsonb(OLD)->>'project_type' IN ('casting','job') OR coalesce((to_jsonb(OLD)->>'is_composable')::boolean,false)))) THEN
    RAISE EXCEPTION 'Your industry application must be approved before creating or managing projects.' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_industry_project_write() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER industry_project_approval BEFORE INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_industry_project_write();

-- Adding an industry lane and completing industry onboarding are not authorization bypasses.
CREATE OR REPLACE FUNCTION public.guard_industry_profile_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_industry_approval(auth.uid()) AND NOT public.auth_is_platform_admin() THEN
    IF NEW.onboarding_completed_at IS NOT NULL AND (
      (TG_OP='INSERT' AND lower(coalesce(NEW.account_type,'')) IN ('lookingfortalent','looking_for_talent'))
      OR (TG_OP='UPDATE' AND OLD.onboarding_completed_at IS NULL AND lower(coalesce(NEW.account_type,'')) IN ('lookingfortalent','looking_for_talent'))
      OR (TG_OP='UPDATE' AND OLD.onboarding_completed_at IS NOT NULL AND 'lookingForTalent'=ANY(NEW.enabled_shells)
          AND NOT ('lookingForTalent'=ANY(OLD.enabled_shells)))
    ) THEN RAISE EXCEPTION 'Your industry application must be approved before entering the industry workspace.' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_industry_profile_completion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER industry_profile_completion BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_industry_profile_completion();

-- Existing casting management RPCs/policies share this operator predicate.
CREATE OR REPLACE FUNCTION public.is_project_operator(p_project_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user_id IS NOT NULL AND (
    public.has_industry_approval(p_user_id) OR EXISTS(
      SELECT 1 FROM public.projects p WHERE p.id=p_project_id
      AND coalesce(to_jsonb(p)->>'project_type','') NOT IN ('casting','job')
      AND NOT coalesce((to_jsonb(p)->>'is_composable')::boolean,false)
    )
  ) AND (
    EXISTS(SELECT 1 FROM public.projects p WHERE p.id=p_project_id AND p.poster_id=p_user_id)
    OR EXISTS(SELECT 1 FROM public.project_members pm WHERE pm.project_id=p_project_id AND pm.user_id=p_user_id AND pm.role='admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_project_operator(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_project_operator(uuid,uuid) TO authenticated,service_role;

-- Candidate synchronization from a talent submission remains possible through its existing
-- trusted triggers; direct client pipeline writes require approval.
DO $$ BEGIN
  IF to_regclass('public.casting_candidates') IS NOT NULL THEN
    CREATE POLICY industry_candidate_insert ON public.casting_candidates AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.has_industry_approval());
    CREATE POLICY industry_candidate_update ON public.casting_candidates AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.has_industry_approval()) WITH CHECK(public.has_industry_approval());
    CREATE POLICY industry_candidate_delete ON public.casting_candidates AS RESTRICTIVE FOR DELETE TO authenticated USING(public.has_industry_approval());
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_project_operator(p_project_id uuid)
RETURNS public.projects LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_project public.projects;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Your industry application must be approved before managing projects.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_project FROM public.projects WHERE id=p_project_id;
  IF v_project.id IS NULL OR NOT public.is_project_operator(p_project_id,auth.uid()) THEN
    RAISE EXCEPTION 'Only the project owner or an admin can change this project.' USING ERRCODE='42501';
  END IF;
  RETURN v_project;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_project_operator(uuid) FROM PUBLIC,anon,authenticated;

-- Paying for Industry Pro cannot substitute for staff approval. Dancer Pro is unchanged.
CREATE OR REPLACE FUNCTION public.user_has_pro_messaging_outreach(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(public.effective_dancer_plan_tier(p_user_id)='pro'
    OR (public.has_industry_approval(p_user_id) AND public.effective_choreographer_plan_tier(p_user_id)='pro'),false);
$$;
REVOKE ALL ON FUNCTION public.user_has_pro_messaging_outreach(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_has_pro_messaging_outreach(uuid) TO authenticated,service_role;


-- The existing staff authority uses profiles.role. Never let an applicant promote
-- themselves through a profile upsert and then approve their own/another account.
CREATE OR REPLACE FUNCTION public.guard_industry_reviewer_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.auth_is_platform_admin() THEN
    IF (to_jsonb(NEW)->>'role'='admin' AND (TG_OP='INSERT' OR to_jsonb(OLD)->>'role' IS DISTINCT FROM 'admin'))
       OR (TG_OP='UPDATE' AND to_jsonb(OLD)->>'role'='admin' AND to_jsonb(NEW)->>'role' IS DISTINCT FROM 'admin') THEN
      RAISE EXCEPTION 'Only Motiion staff can change reviewer access.' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_industry_reviewer_role() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER industry_reviewer_role BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_industry_reviewer_role();

-- Legacy hiring helpers must not accept a client-selected profile role as approval.
CREATE OR REPLACE FUNCTION public.can_user_create_jobs(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_industry_approval(p_user_id);
$$;
REVOKE ALL ON FUNCTION public.can_user_create_jobs(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_user_create_jobs(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.can_user_create_production_jobs(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_industry_approval(p_user_id);
$$;
REVOKE ALL ON FUNCTION public.can_user_create_production_jobs(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_user_create_production_jobs(uuid) TO authenticated,service_role;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['availability_check_requests','size_sheet_requests'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('CREATE TRIGGER industry_request_approval BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_industry_approval_write()',t);
    END IF;
  END LOOP;
END; $$;
