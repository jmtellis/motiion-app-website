-- Project modules: container model decoupled from casting

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type VARCHAR(40) DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS enabled_modules JSONB NOT NULL DEFAULT '{"casting":false,"activities":false}',
  ADD COLUMN IF NOT EXISTS project_configuration JSONB NOT NULL DEFAULT '{"attachments":[]}';

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS casting_id UUID REFERENCES public.castings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS roles_casting_id_idx ON public.roles(casting_id);
