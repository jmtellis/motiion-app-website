-- Match iOS OnboardingProfile.additionalAgents → profiles.additional_agents
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS additional_agents text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.additional_agents IS
  'Additional representation/agency names beyond primary agent (talent profiles).';
