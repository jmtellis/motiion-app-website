-- Work links are optional; validate supplied links and preserve approval/version guards.
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
    OR coalesce(p_contact_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    OR (length(btrim(coalesce(p_work_url,''))) > 0 AND (
      btrim(p_work_url) ~ '^https?://[^/]*@'
      OR length(btrim(p_work_url)) > 2000
      OR btrim(p_work_url) !~ '^https?://[^[:space:]/]+[.][^[:space:]/]+(/[^[:space:]]*)?$'
    ))
  THEN RAISE EXCEPTION 'Add your name, role, company or Independent, email, and a brief description of your projects.' USING ERRCODE='22023'; END IF;
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
  VALUES(v_uid,btrim(p_full_name),btrim(p_professional_role),btrim(p_organization),lower(btrim(p_contact_email)),btrim(coalesce(p_work_url,'')),btrim(p_hiring_projects))
  ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,professional_role=excluded.professional_role,
    organization=excluded.organization,contact_email=excluded.contact_email,work_url=excluded.work_url,hiring_projects=excluded.hiring_projects,
    status='pending',version=industry_applications.version+1,submitted_at=now(),reviewed_at=NULL,reviewed_by=NULL
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_industry_application(text,text,text,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_industry_application(text,text,text,text,text,text,integer) TO authenticated;
