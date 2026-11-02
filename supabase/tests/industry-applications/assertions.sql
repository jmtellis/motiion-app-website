\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $$ BEGIN
  IF public.has_industry_approval() THEN RAISE EXCEPTION 'Unreviewed account has access'; END IF;
  IF public.can_user_create_jobs(auth.uid()) OR public.can_user_create_production_jobs(auth.uid()) THEN RAISE EXCEPTION 'Legacy hiring bypass'; END IF;
  BEGIN INSERT INTO public.availability_check_requests DEFAULT VALUES; RAISE EXCEPTION 'Availability request bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF public.user_has_pro_messaging_outreach(auth.uid()) THEN RAISE EXCEPTION 'Paid plan bypassed approval'; END IF;
  BEGIN UPDATE public.profiles SET role='admin' WHERE user_id=auth.uid(); RAISE EXCEPTION 'Reviewer escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.roles DEFAULT VALUES; RAISE EXCEPTION 'Role write bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.test_definer_casting(); RAISE EXCEPTION 'Definer bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.projects(project_type,is_composable) VALUES('casting',true); RAISE EXCEPTION 'Project bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET onboarding_completed_at=now() WHERE user_id=auth.uid(); RAISE EXCEPTION 'Completion bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.submit_industry_application('Alex','Producer','Independent','alex@gmail.com','javascript:alert(1)','Music videos and tours',0); RAISE EXCEPTION 'Bad URL accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT public.submit_industry_application('Alex','Producer','Independent','alex@gmail.com','','Music videos and tours',0);
DO $$ BEGIN
  BEGIN UPDATE public.industry_applications SET status='approved'; RAISE EXCEPTION 'Self approval bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.review_industry_application(auth.uid(),1,'approved',NULL); RAISE EXCEPTION 'Nonadmin review bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Corrections increment a version. Staff must review the latest evidence.
SELECT public.submit_industry_application('Alex','Producer','Independent','alex@gmail.com','https://example.com/work','Commercials and tours',1);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false);
DO $$ BEGIN
  BEGIN PERFORM public.review_industry_application('00000000-0000-0000-0000-000000000001',1,'approved',NULL); RAISE EXCEPTION 'Stale approval accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.review_industry_application('00000000-0000-0000-0000-000000000001',2,'needs_information',''); RAISE EXCEPTION 'Missing feedback accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Missing feedback accepted' THEN RAISE; END IF; END;
END $$;
SELECT public.review_industry_application('00000000-0000-0000-0000-000000000001',2,'needs_information','Please add credits showing your role.');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
DO $$ BEGIN
  IF NOT public.user_has_pro_messaging_outreach(auth.uid()) THEN RAISE EXCEPTION 'Dancer outreach changed'; END IF;
  IF EXISTS(SELECT 1 FROM public.industry_applications) THEN RAISE EXCEPTION 'Applicant privacy failed'; END IF;
END $$;
-- Talent event management and request responses are unaffected by industry review.
DO $$ BEGIN
  IF NOT public.is_project_operator((SELECT id FROM public.projects WHERE poster_id=auth.uid()),auth.uid()) THEN RAISE EXCEPTION 'Talent event management changed'; END IF;
END $$;
UPDATE public.availability_check_requests SET response='available' WHERE recipient_id=auth.uid();
-- Talent submission synchronization is unaffected by industry review.
INSERT INTO public.submissions(talent_id) VALUES(auth.uid());
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.casting_candidates WHERE talent_id=auth.uid()) THEN RAISE EXCEPTION 'Talent submission broke'; END IF;
  BEGIN INSERT INTO public.casting_candidates(talent_id) VALUES(auth.uid()); RAISE EXCEPTION 'Direct pipeline bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT public.submit_industry_application('Alex','Producer','Independent','alex@gmail.com','https://example.com/credits','Commercials and tours; producer credits linked',2);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false);
SELECT public.review_industry_application('00000000-0000-0000-0000-000000000001',3,'rejected','Please provide verifiable professional work.');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT public.submit_industry_application('Alex','Producer','Independent','alex@gmail.com','https://example.com/credits','Commercials and tours; updated verifiable credits',3);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false);
SELECT public.review_industry_application('00000000-0000-0000-0000-000000000001',4,'approved',NULL);
DO $$ BEGIN IF (SELECT count(*) FROM public.industry_application_reviews) <> 3 THEN RAISE EXCEPTION 'Review audit missing'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $$ BEGIN IF NOT public.has_industry_approval() THEN RAISE EXCEPTION 'Approved user denied'; END IF; END $$;
INSERT INTO public.roles DEFAULT VALUES;
INSERT INTO public.projects(poster_id,project_type,is_composable) VALUES(auth.uid(),'casting',true);
UPDATE public.profiles SET onboarding_completed_at=now() WHERE user_id=auth.uid();
DO $$ BEGIN
  BEGIN PERFORM public.submit_industry_application('Alex','Producer','Independent','alex@gmail.com','https://example.com','Changed work description',4); RAISE EXCEPTION 'Approved application overwritten'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Approved application overwritten' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF has_table_privilege('authenticated','public.industry_applications','UPDATE') OR has_table_privilege('anon','public.industry_applications','SELECT') THEN RAISE EXCEPTION 'Table grants unsafe'; END IF;
  IF has_function_privilege('anon','public.review_industry_application(uuid,integer,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous reviewer'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id='00000000-0000-0000-0000-000000000002' AND account_type='talent' AND onboarding_completed_at IS NOT NULL) THEN RAISE EXCEPTION 'Talent profile changed'; END IF;
END $$;
SELECT 'Industry application authorization tests passed' AS result;

-- A transition grant does not fabricate an application and is independently revocable.
INSERT INTO public.industry_legacy_access_grants(user_id,reason,authorization_reference)
VALUES('00000000-0000-0000-0000-000000000002','Isolated test','local-test');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
DO $$ BEGIN
  IF NOT public.has_industry_approval() THEN RAISE EXCEPTION 'Legacy grant ignored'; END IF;
  IF EXISTS(SELECT 1 FROM public.industry_applications WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Fake application created'; END IF;
  BEGIN UPDATE public.industry_legacy_access_grants SET revoked_at=NULL; RAISE EXCEPTION 'Client can edit grant'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.industry_legacy_access_grants SET revoked_at=now(),revocation_reason='Test complete';
SET ROLE authenticated;
DO $$ BEGIN IF public.has_industry_approval() THEN RAISE EXCEPTION 'Revocation ignored'; END IF; END $$;
RESET ROLE;
SELECT 'Legacy access tests passed' AS result;
