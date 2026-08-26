-- Migration 013: AI Agent Readiness
-- Stores results from the website agent-readiness scanner.
-- Also extends the opportunities category constraint to include 'agent_readiness'.

-- ---------------------------------------------------------------------------
-- Extend existing opportunities category CHECK
-- ---------------------------------------------------------------------------
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_category_check;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_category_check
  CHECK (category IN (
    'content', 'service_page', 'technical', 'structured_data',
    'entity_consistency', 'citations', 'reviews_reputation',
    'local_presence', 'competitor_gap', 'agent_readiness'
  ));

-- ---------------------------------------------------------------------------
-- agent_readiness_scans
-- One record per scan run per business.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_readiness_scans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  domain            TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Human-readable readiness status + deterministic 0-100 score
  readiness_status  TEXT        CHECK (readiness_status IN (
                                  'not_ready', 'needs_work', 'partially_ready', 'agent_ready'
                                )),
  readiness_score   INTEGER     CHECK (readiness_score >= 0 AND readiness_score <= 100),

  -- WebMCP summary
  webmcp_detected   BOOLEAN     NOT NULL DEFAULT false,
  webmcp_tool_count INTEGER     NOT NULL DEFAULT 0,

  -- Action counts
  actions_detected  INTEGER     NOT NULL DEFAULT 0,
  actions_ready     INTEGER     NOT NULL DEFAULT 0,

  error             TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_readiness_scans_business_id_idx
  ON public.agent_readiness_scans (business_id, created_at DESC);

ALTER TABLE public.agent_readiness_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_readiness_scans_owner_all"
  ON public.agent_readiness_scans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- agent_readiness_actions
-- One record per detected/recommended action per scan.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_readiness_actions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               UUID        NOT NULL REFERENCES public.agent_readiness_scans(id) ON DELETE CASCADE,
  business_id           UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Action classification
  action_type           TEXT        NOT NULL,  -- e.g. 'contact_business', 'request_quote'
  label                 TEXT        NOT NULL,  -- Human label: 'Contact Business'
  page_url              TEXT,                  -- URL where the action was found

  -- Detection state
  detected              BOOLEAN     NOT NULL DEFAULT false,  -- form/link found on website
  webmcp_ready          BOOLEAN     NOT NULL DEFAULT false,  -- exposed as WebMCP tool
  confidence            TEXT        CHECK (confidence IN ('high', 'medium', 'low')),

  -- Evidence and recommendation
  evidence              TEXT,
  recommendation        TEXT,
  recommended_tool_name TEXT,                  -- e.g. 'request_quote'

  -- Claude prompt (Fix with Claude)
  claude_prompt         TEXT,

  -- Verification state after user applies fix
  verification_status   TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verified_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_readiness_actions_scan_id_idx
  ON public.agent_readiness_actions (scan_id);

CREATE INDEX IF NOT EXISTS agent_readiness_actions_business_id_idx
  ON public.agent_readiness_actions (business_id);

ALTER TABLE public.agent_readiness_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_readiness_actions_owner_all"
  ON public.agent_readiness_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );
