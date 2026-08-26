-- Migration 010: 14-day free trial + competitor enrichment fields
--
-- TRIAL STRATEGY FOR EXISTING USERS:
--   New accounts automatically receive trial_starts_at = NOW() and
--   trial_ends_at = NOW() + 14 days via the trigger below.
--   Existing accounts (pre-migration) receive a 30-day grace period from
--   the migration run date so no active dev/test accounts are locked out.
--   This is intentional and documented here.

-- ─── 1. Trial fields on profiles ─────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_starts_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz;

-- Initialize trial for ALL existing profiles:
-- We give them a 30-day grace window from migration run date
-- (longer than the standard 14 days to avoid breaking active dev accounts).
UPDATE public.profiles
SET
  trial_starts_at = COALESCE(trial_starts_at, created_at),
  trial_ends_at   = COALESCE(trial_ends_at, NOW() + INTERVAL '30 days')
WHERE trial_ends_at IS NULL;

-- Trigger function: auto-set trial dates for newly created profiles
CREATE OR REPLACE FUNCTION public.initialize_profile_trial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.trial_starts_at IS NULL THEN
    NEW.trial_starts_at := NOW();
    NEW.trial_ends_at   := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_init_trial ON public.profiles;
CREATE TRIGGER on_profile_created_init_trial
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_profile_trial();

-- ─── 2. Competitor enrichment fields ─────────────────────────────────────────
--
-- Adds rich place data to business_competitors without touching existing rows.
-- Existing rows keep NULL for the new columns (enrichment_status = 'none').

ALTER TABLE public.business_competitors
  ADD COLUMN IF NOT EXISTS place_id           text,
  ADD COLUMN IF NOT EXISTS formatted_address  text,
  ADD COLUMN IF NOT EXISTS city               text,
  ADD COLUMN IF NOT EXISTS region             text,
  ADD COLUMN IF NOT EXISTS country            text,
  ADD COLUMN IF NOT EXISTS latitude           double precision,
  ADD COLUMN IF NOT EXISTS longitude          double precision,
  ADD COLUMN IF NOT EXISTS category           text,
  ADD COLUMN IF NOT EXISTS phone              text,
  -- 'none' | 'partial' | 'complete' | 'failed'
  ADD COLUMN IF NOT EXISTS enrichment_status  text NOT NULL DEFAULT 'none';

-- Prevent duplicate competitors for the same business
-- (ON CONFLICT DO NOTHING in inserts uses this)
CREATE UNIQUE INDEX IF NOT EXISTS business_competitors_unique_name
  ON public.business_competitors (business_id, lower(name));

-- Index for faster competitor lookups by place_id
CREATE INDEX IF NOT EXISTS business_competitors_place_id_idx
  ON public.business_competitors (place_id)
  WHERE place_id IS NOT NULL;
