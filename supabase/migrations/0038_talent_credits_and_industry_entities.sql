-- Canonical industry entities, talent credits, aliases, and audit log for Talent Navigator credit search.

-- ---------------------------------------------------------------------------
-- industry_entities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.industry_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'artist',
      'choreographer',
      'creative_director',
      'production',
      'tour',
      'music_video',
      'live_performance',
      'commercial',
      'film',
      'television',
      'event',
      'agency',
      'other'
    )
  ),
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  website_url TEXT,
  external_reference_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_pending BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, normalized_name)
);

CREATE INDEX IF NOT EXISTS industry_entities_normalized_name_idx
  ON public.industry_entities (normalized_name);
CREATE INDEX IF NOT EXISTS industry_entities_entity_type_idx
  ON public.industry_entities (entity_type);
CREATE INDEX IF NOT EXISTS industry_entities_is_pending_idx
  ON public.industry_entities (is_pending)
  WHERE is_pending = TRUE;

-- ---------------------------------------------------------------------------
-- industry_entity_aliases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.industry_entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.industry_entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS industry_entity_aliases_normalized_alias_idx
  ON public.industry_entity_aliases (normalized_alias);

-- ---------------------------------------------------------------------------
-- talent_credits (talent_id = profiles.user_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  credit_type TEXT NOT NULL CHECK (
    credit_type IN (
      'tour',
      'music_video',
      'live_performance',
      'commercial',
      'film',
      'television',
      'award_show',
      'event',
      'class',
      'training',
      'other'
    )
  ),

  production_entity_id UUID REFERENCES public.industry_entities(id) ON DELETE SET NULL,
  artist_entity_id UUID REFERENCES public.industry_entities(id) ON DELETE SET NULL,
  choreographer_entity_id UUID REFERENCES public.industry_entities(id) ON DELETE SET NULL,
  creative_director_entity_id UUID REFERENCES public.industry_entities(id) ON DELETE SET NULL,

  role TEXT,
  production_name_fallback TEXT,
  notes TEXT,

  start_date DATE,
  end_date DATE,
  credit_year INTEGER,

  verification_status TEXT NOT NULL DEFAULT 'talent_reported' CHECK (
    verification_status IN (
      'motiion_verified',
      'industry_confirmed',
      'document_supported',
      'talent_reported',
      'ai_extracted',
      'unverified'
    )
  ),

  verification_confidence NUMERIC,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (
    source_type IN (
      'manual',
      'resume',
      'platform_booking',
      'industry_confirmation',
      'admin_import',
      'external_source',
      'other'
    )
  ),

  source_reference TEXT,
  source_document_url TEXT,
  source_text TEXT,

  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_searchable BOOLEAN NOT NULL DEFAULT TRUE,

  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS talent_credits_talent_id_idx ON public.talent_credits (talent_id);
CREATE INDEX IF NOT EXISTS talent_credits_artist_entity_id_idx ON public.talent_credits (artist_entity_id);
CREATE INDEX IF NOT EXISTS talent_credits_choreographer_entity_id_idx ON public.talent_credits (choreographer_entity_id);
CREATE INDEX IF NOT EXISTS talent_credits_production_entity_id_idx ON public.talent_credits (production_entity_id);
CREATE INDEX IF NOT EXISTS talent_credits_verification_status_idx ON public.talent_credits (verification_status);
CREATE INDEX IF NOT EXISTS talent_credits_credit_year_idx ON public.talent_credits (credit_year);
CREATE INDEX IF NOT EXISTS talent_credits_artist_searchable_idx
  ON public.talent_credits (artist_entity_id, is_searchable)
  WHERE is_public = TRUE AND is_searchable = TRUE;
CREATE INDEX IF NOT EXISTS talent_credits_choreographer_searchable_idx
  ON public.talent_credits (choreographer_entity_id, is_searchable)
  WHERE is_public = TRUE AND is_searchable = TRUE;
CREATE INDEX IF NOT EXISTS talent_credits_production_searchable_idx
  ON public.talent_credits (production_entity_id, is_searchable)
  WHERE is_public = TRUE AND is_searchable = TRUE;

-- ---------------------------------------------------------------------------
-- credit_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_audit_log_resource_idx
  ON public.credit_audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS credit_audit_log_actor_idx
  ON public.credit_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS credit_audit_log_created_at_idx
  ON public.credit_audit_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.industry_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS industry_entities_select_authenticated ON public.industry_entities;
CREATE POLICY industry_entities_select_authenticated ON public.industry_entities
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS industry_entity_aliases_select_authenticated ON public.industry_entity_aliases;
CREATE POLICY industry_entity_aliases_select_authenticated ON public.industry_entity_aliases
  FOR SELECT TO authenticated
  USING (TRUE);

-- Talent can suggest pending entities (insert only when is_pending)
DROP POLICY IF EXISTS industry_entities_insert_pending ON public.industry_entities;
CREATE POLICY industry_entities_insert_pending ON public.industry_entities
  FOR INSERT TO authenticated
  WITH CHECK (is_pending = TRUE AND is_verified = FALSE);

-- Credits: owners manage own; buyers read searchable public credits
DROP POLICY IF EXISTS talent_credits_select_own ON public.talent_credits;
CREATE POLICY talent_credits_select_own ON public.talent_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = talent_id);

DROP POLICY IF EXISTS talent_credits_select_searchable ON public.talent_credits;
CREATE POLICY talent_credits_select_searchable ON public.talent_credits
  FOR SELECT TO authenticated
  USING (
    is_public = TRUE
    AND is_searchable = TRUE
    AND verification_status <> 'ai_extracted'
  );

DROP POLICY IF EXISTS talent_credits_insert_own ON public.talent_credits;
CREATE POLICY talent_credits_insert_own ON public.talent_credits
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = talent_id
    AND verification_status IN ('talent_reported', 'ai_extracted', 'unverified')
  );

DROP POLICY IF EXISTS talent_credits_update_own ON public.talent_credits;
CREATE POLICY talent_credits_update_own ON public.talent_credits
  FOR UPDATE TO authenticated
  USING (auth.uid() = talent_id)
  WITH CHECK (
    auth.uid() = talent_id
    AND verification_status IN ('talent_reported', 'ai_extracted', 'unverified', 'document_supported')
  );

DROP POLICY IF EXISTS talent_credits_delete_own ON public.talent_credits;
CREATE POLICY talent_credits_delete_own ON public.talent_credits
  FOR DELETE TO authenticated
  USING (auth.uid() = talent_id);

-- Audit: actors can insert their own rows; select own
DROP POLICY IF EXISTS credit_audit_log_insert_own ON public.credit_audit_log;
CREATE POLICY credit_audit_log_insert_own ON public.credit_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

DROP POLICY IF EXISTS credit_audit_log_select_own ON public.credit_audit_log;
CREATE POLICY credit_audit_log_select_own ON public.credit_audit_log
  FOR SELECT TO authenticated
  USING (auth.uid() = actor_id);

COMMENT ON TABLE public.industry_entities IS
  'Canonical artists, choreographers, productions, and related industry entities for credit search.';
COMMENT ON TABLE public.talent_credits IS
  'Structured searchable work history for talent. High-trust verification updates via service role only.';
COMMENT ON TABLE public.credit_audit_log IS
  'Audit trail for credit and entity mutations.';

-- ---------------------------------------------------------------------------
-- Dev seed data (fictional / clearly designated)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  beyonce_id UUID := '11111111-1111-4111-8111-111111111101';
  rihanna_id UUID := '11111111-1111-4111-8111-111111111102';
  sean_id UUID := '11111111-1111-4111-8111-111111111103';
  jaquel_id UUID := '11111111-1111-4111-8111-111111111104';
  renaissance_id UUID := '11111111-1111-4111-8111-111111111105';
  brian_a_id UUID := '11111111-1111-4111-8111-111111111106';
  brian_b_id UUID := '11111111-1111-4111-8111-111111111107';
BEGIN
  INSERT INTO public.industry_entities (id, entity_type, canonical_name, normalized_name, is_verified, metadata)
  VALUES
    (beyonce_id, 'artist', 'Beyoncé', 'beyonce', TRUE, '{"seed": true}'::jsonb),
    (rihanna_id, 'artist', 'Rihanna', 'rihanna', TRUE, '{"seed": true}'::jsonb),
    (sean_id, 'choreographer', 'Sean Bankhead', 'sean bankhead', TRUE, '{"seed": true}'::jsonb),
    (jaquel_id, 'choreographer', 'JaQuel Knight', 'jaquel knight', TRUE, '{"seed": true}'::jsonb),
    (renaissance_id, 'tour', 'Renaissance World Tour', 'renaissance world tour', TRUE, '{"seed": true}'::jsonb),
    (brian_a_id, 'choreographer', 'Brian Friedman', 'brian friedman', TRUE, '{"seed": true, "note": "Dev duplicate A"}'::jsonb),
    (brian_b_id, 'choreographer', 'Brian Friedman (NY)', 'brian friedman ny', TRUE, '{"seed": true, "note": "Dev duplicate B for ambiguous tests"}'::jsonb)
  ON CONFLICT (entity_type, normalized_name) DO NOTHING;

  INSERT INTO public.industry_entity_aliases (entity_id, alias, normalized_alias)
  VALUES
    (beyonce_id, 'Beyonce', 'beyonce'),
    (beyonce_id, 'Beyoncé Knowles', 'beyonce knowles'),
    (beyonce_id, 'Beyoncé Knowles-Carter', 'beyonce knowles carter'),
    (sean_id, 'Sean Bank Head', 'sean bank head'),
    (renaissance_id, 'Renaissance Tour', 'renaissance tour')
  ON CONFLICT (entity_id, normalized_alias) DO NOTHING;
END $$;
