-- Migration 017: Account-Level Billing Architecture
-- Customers.Direct — 2026-08-v1
--
-- Introduces:
--   billing_accounts        — one row per auth user (Stripe Customer boundary)
--   business_billing_items  — one row per business (Stripe Subscription Item)
--   usage_events            — global usage / cost ledger
--   stripe_webhook_events   — idempotency store for Stripe webhooks
--
-- Safely preserves all existing beta user data.
-- Existing subscriptions rows are migrated to beta status.
-- No existing business/profile/scan data is modified.
--
-- IDEMPOTENT: Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. Update subscriptions.plan check constraint to allow new plan IDs
--    (keeps old plan IDs for backward compat during transition)
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check CHECK (
    plan IN (
      -- Legacy plan IDs (keep for existing rows)
      'none', 'ai_visibility', 'growth_agent', 'autonomous_growth',
      -- New canonical plan IDs
      'starter', 'growth', 'pro', 'enterprise',
      -- Beta placeholder
      'beta'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. billing_accounts — one per auth user account
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,

  -- Status
  status                  TEXT NOT NULL DEFAULT 'none'
    CHECK (status IN ('none', 'trialing', 'active', 'past_due', 'canceled')),

  -- Trial
  trial_started_at        TIMESTAMPTZ,
  trial_ends_at           TIMESTAMPTZ,

  -- Current billing period
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,

  -- Billing interval (for future annual support)
  billing_interval        TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_interval IN ('monthly', 'annual')),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_accounts_user_id_idx
  ON public.billing_accounts (user_id);
CREATE INDEX IF NOT EXISTS billing_accounts_stripe_customer_id_idx
  ON public.billing_accounts (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_accounts_status_idx
  ON public.billing_accounts (status);

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

-- Users may read their own billing account only
CREATE POLICY "billing_accounts_select_own" ON public.billing_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role (webhooks, admin) may write
CREATE POLICY "billing_accounts_service_all" ON public.billing_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. business_billing_items — one per business (Stripe Subscription Item)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_billing_items (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id            UUID NOT NULL
    REFERENCES public.billing_accounts(id) ON DELETE CASCADE,
  business_id                   UUID UNIQUE NOT NULL
    REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Plan
  plan_id                       TEXT NOT NULL DEFAULT 'beta'
    CHECK (plan_id IN ('beta', 'starter', 'growth', 'pro', 'enterprise')),

  -- Stripe
  stripe_subscription_item_id   TEXT UNIQUE,

  -- Status
  status                        TEXT NOT NULL DEFAULT 'beta'
    CHECK (status IN ('beta', 'trialing', 'active', 'past_due', 'canceled', 'inactive')),

  -- Snapshot price at time of subscription (cents)
  price_monthly_cents           INTEGER,

  -- Period end for this item
  current_period_end            TIMESTAMPTZ,

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_billing_items_billing_account_id_idx
  ON public.business_billing_items (billing_account_id);
CREATE INDEX IF NOT EXISTS business_billing_items_business_id_idx
  ON public.business_billing_items (business_id);
CREATE INDEX IF NOT EXISTS business_billing_items_status_idx
  ON public.business_billing_items (status);
CREATE INDEX IF NOT EXISTS business_billing_items_stripe_item_id_idx
  ON public.business_billing_items (stripe_subscription_item_id)
  WHERE stripe_subscription_item_id IS NOT NULL;

ALTER TABLE public.business_billing_items ENABLE ROW LEVEL SECURITY;

-- Users may read billing items for their own businesses
CREATE POLICY "business_billing_items_select_own" ON public.business_billing_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_user_id = auth.uid()
    )
  );

-- Only service role may write
CREATE POLICY "business_billing_items_service_all" ON public.business_billing_items
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. usage_events — global usage & cost ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id         UUID REFERENCES public.businesses(id) ON DELETE SET NULL,

  -- Type of usage
  usage_type          TEXT NOT NULL
    CHECK (usage_type IN (
      'ai_visibility_check',
      'direct_agent',
      'prompt_generation',
      'claude_fix',
      'dataforseo',
      'google_places',
      'report_generation',
      'other'
    )),

  -- Provider / model (nullable for non-AI usage)
  provider            TEXT,
  model               TEXT,

  -- Quantity (AI Checks = prompts × models × executions)
  quantity            INTEGER NOT NULL DEFAULT 1,

  -- Token counts (when provider response exposes them)
  input_tokens        BIGINT,
  output_tokens       BIGINT,
  request_count       INTEGER NOT NULL DEFAULT 1,

  -- Cost (estimated or actual)
  estimated_cost_usd  NUMERIC(12, 6) NOT NULL DEFAULT 0,

  -- Link to visibility run if applicable
  visibility_run_id   UUID,

  -- Arbitrary metadata (model version, prompt count, etc.)
  metadata            JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_account_user_id_idx
  ON public.usage_events (account_user_id);
CREATE INDEX IF NOT EXISTS usage_events_business_id_idx
  ON public.usage_events (business_id)
  WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS usage_events_created_at_idx
  ON public.usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_usage_type_idx
  ON public.usage_events (usage_type);
CREATE INDEX IF NOT EXISTS usage_events_provider_idx
  ON public.usage_events (provider)
  WHERE provider IS NOT NULL;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Users see their own usage only
CREATE POLICY "usage_events_select_own" ON public.usage_events
  FOR SELECT USING (auth.uid() = account_user_id);

-- Service role inserts all usage
CREATE POLICY "usage_events_service_all" ON public.usage_events
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. stripe_webhook_events — idempotency store
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id   TEXT UNIQUE NOT NULL,
  event_type        TEXT NOT NULL,
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  error             TEXT
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_stripe_event_id_idx
  ON public.stripe_webhook_events (stripe_event_id);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx
  ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No user access — service role only
CREATE POLICY "stripe_webhook_events_service_all" ON public.stripe_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 6. Migrate existing beta subscriptions data
--    Creates billing_accounts + business_billing_items for existing users
--    All are marked 'beta' / 'none' — NOT charged. Safe.
-- ---------------------------------------------------------------------------

-- Create billing_accounts for every existing auth user who has a profile
INSERT INTO public.billing_accounts (user_id, status, created_at, updated_at)
SELECT
  p.id            AS user_id,
  'none'          AS status,
  p.created_at,
  now()           AS updated_at
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- Create business_billing_items for every existing business
-- Link to the billing_account for that business's owner
-- Mark as 'beta' — no charges
INSERT INTO public.business_billing_items (
  billing_account_id,
  business_id,
  plan_id,
  status,
  created_at,
  updated_at
)
SELECT
  ba.id           AS billing_account_id,
  b.id            AS business_id,
  'beta'          AS plan_id,
  'beta'          AS status,
  b.created_at,
  now()           AS updated_at
FROM public.businesses b
JOIN public.billing_accounts ba ON ba.user_id = b.owner_user_id
ON CONFLICT (business_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Trigger: auto-create billing_account on new user signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_billing_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.billing_accounts (user_id, status)
  VALUES (NEW.id, 'none')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_profile_create_billing_account ON public.profiles;
CREATE TRIGGER on_new_profile_create_billing_account
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_billing_account();

-- ---------------------------------------------------------------------------
-- 8. Trigger: auto-create business_billing_item on new business
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_business_billing_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_account_id UUID;
BEGIN
  SELECT id INTO v_billing_account_id
  FROM public.billing_accounts
  WHERE user_id = NEW.owner_user_id;

  IF v_billing_account_id IS NOT NULL THEN
    INSERT INTO public.business_billing_items (
      billing_account_id,
      business_id,
      plan_id,
      status
    ) VALUES (
      v_billing_account_id,
      NEW.id,
      'beta',
      'beta'
    )
    ON CONFLICT (business_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_business_create_billing_item ON public.businesses;
CREATE TRIGGER on_new_business_create_billing_item
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_business_billing_item();

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
