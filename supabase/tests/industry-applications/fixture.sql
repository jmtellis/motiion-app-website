CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION public.auth_is_platform_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='00000000-0000-0000-0000-000000000099'::uuid $$;
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY REFERENCES auth.users,account_type text,enabled_shells text[] DEFAULT '{}',onboarding_completed_at timestamptz);
CREATE TABLE public.projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),poster_id uuid,project_type text,is_composable boolean DEFAULT false,title text);
CREATE TABLE public.project_members(project_id uuid,user_id uuid,role text);
CREATE TABLE public.roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,poster_id uuid);
CREATE TABLE public.castings(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.casting_candidates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),talent_id uuid);
ALTER TABLE public.casting_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY candidate_test ON public.casting_candidates TO authenticated USING(true) WITH CHECK(true);
CREATE TABLE public.submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),talent_id uuid);
CREATE FUNCTION public.sync_test_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.casting_candidates(talent_id) VALUES(NEW.talent_id); RETURN NEW; END $$;
CREATE TRIGGER submission_sync AFTER INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.sync_test_submission();
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.projects,public.roles,public.castings,public.casting_candidates,public.submissions TO authenticated;
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000099');
INSERT INTO public.profiles VALUES('00000000-0000-0000-0000-000000000001','lookingForTalent','{lookingForTalent}',NULL),('00000000-0000-0000-0000-000000000002','talent','{talent}',now());
CREATE FUNCTION public.test_definer_casting() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.castings DEFAULT VALUES; END $$;

CREATE FUNCTION public.effective_dancer_plan_tier(uuid) RETURNS text LANGUAGE sql AS $$ SELECT CASE WHEN $1='00000000-0000-0000-0000-000000000002'::uuid THEN 'pro' ELSE 'free' END $$;
CREATE FUNCTION public.effective_choreographer_plan_tier(uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'pro'::text $$;

ALTER TABLE public.profiles ADD COLUMN role text;

CREATE TABLE public.availability_check_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_id uuid,response text);
CREATE TABLE public.size_sheet_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_id uuid,response text);
GRANT INSERT,UPDATE,SELECT ON public.availability_check_requests,public.size_sheet_requests TO authenticated;
INSERT INTO public.availability_check_requests(recipient_id) VALUES('00000000-0000-0000-0000-000000000002');
INSERT INTO public.projects(poster_id,project_type,is_composable) VALUES('00000000-0000-0000-0000-000000000002','event',false);
