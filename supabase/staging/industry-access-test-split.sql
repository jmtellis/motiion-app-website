-- STAGING ONLY: mvkvztpvakybrhyupown (industry-staging).
-- Run only against that explicitly verified project; never include in production migrations.
-- Authorized by user on 2026-10-29: one existing industry account retains access,
-- one must apply. Deterministic assignment: first user_id retains access.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE
      (lower(account_type) IN ('lookingfortalent','looking_for_talent') OR 'lookingForTalent'=ANY(enabled_shells))
      AND role IS DISTINCT FROM 'admin') <> 2
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id='3ae73625-1283-4a71-9c9c-550422c40cb4' AND email='jay.preview.mv5dthuf@example.com')
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id='59b14705-fa18-47b6-8c38-44deec65de4c' AND email='demo_avery_quinn@example.com')
    OR EXISTS(SELECT 1 FROM public.industry_legacy_access_grants)
    OR EXISTS(SELECT 1 FROM public.industry_applications)
  THEN RAISE EXCEPTION 'Staging test split preconditions changed; inspect before proceeding.'; END IF;
  INSERT INTO public.industry_legacy_access_grants(user_id,reason,authorization_reference)
  VALUES('3ae73625-1283-4a71-9c9c-550422c40cb4',
    'Staging test split: Jay Preview retains industry access; Avery Quinn must apply. No application was submitted or reviewed.',
    'User authorization 2026-10-29; chat 01a18868-0532-76c2-98ac-e15f92aa56e4; staging mvkvztpvakybrhyupown only');
END $$;
