-- Admins need the same casting review rows as the owner, without responding as talent.
CREATE POLICY role_access_operator_select ON public.role_access FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.roles r WHERE r.id=role_access.role_id AND public.is_project_operator(r.project_id,(SELECT auth.uid()))));
CREATE POLICY submissions_operator_select ON public.submissions FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.roles r WHERE r.id=submissions.role_id AND public.is_project_operator(r.project_id,(SELECT auth.uid()))));
CREATE POLICY submissions_operator_update ON public.submissions FOR UPDATE TO authenticated
USING(EXISTS(SELECT 1 FROM public.roles r WHERE r.id=submissions.role_id AND public.is_project_operator(r.project_id,(SELECT auth.uid()))))
WITH CHECK(EXISTS(SELECT 1 FROM public.roles r WHERE r.id=submissions.role_id AND public.is_project_operator(r.project_id,(SELECT auth.uid()))));

CREATE OR REPLACE FUNCTION public.guard_submission_reviewer_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.talent_id IS DISTINCT FROM auth.uid()
     AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.talent_id IS DISTINCT FROM OLD.talent_id OR NEW.role_id IS DISTINCT FROM OLD.role_id) THEN
    RAISE EXCEPTION 'Reviewers cannot change the applicant or role of a submission.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_submission_reviewer_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER submission_reviewer_identity BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.guard_submission_reviewer_identity();
