-- Migration 011: Fix trial dates and apply migration 010 changes idempotently
--
-- WHAT THIS FIXES:
--   1. Applies migration 010 column additions in case 010 was never run.
--   2. Resets trial_ends_at for any account where it is NULL or already in
--      the past — gives a 90-day grace period from the migration run date.
--      This is intentionally generous so no active/dev/admin accounts are
--      locked out after the trial system was introduced.
--   3. Ensures the profile trigger is created for new accounts.
--   4. Creates all required indexes idempotently.
--
-- SAFE TO RUN MULTIPLE TIMES (all statements use IF NOT EXISTS / COALESCE).
-- Run this in the Supabase SQL editor or via `supabase db push`.

-- ─── 1. Profiles trial columns (migration 010 — idempotent) ──────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_starts_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz;

-- ─── 2. Fix trial dates for ALL accounts ─────────────────────────────────────
--
-- Accounts without trial dates: set trial_starts_at = created_at, trial_ends_at = NOW() + 90 days
-- Accounts with already-expired trial_ends_at: extend to NOW() + 90 days
--   (This handles the bug where accounts were set expired immediately.)
-- Accounts with future trial_ends_at: leave untouched (COALESCE skips them).

UPDATE public.profiles
SET
  trial_starts_at = COALESCE(trial_starts_at, created_at),
  trial_ends_at   = CASE
    WHEN trial_ends_at IS NULL OR trial_ends_at < NOW()
    THEN NOW() + INTERVAL '90 days'
    ELSE trial_ends_at
  END;

-- ─── 3. Trigger for new accounts ─────────────────────────────────────────────

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

-- ─── 4. Competitor enrichment columns (migration 010 — idempotent) ───────────

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
  ADD COLUMN IF NOT EXISTS enrichment_status  text NOT NULL DEFAULT 'none';

-- ─── 5. Indexes ───────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS business_competitors_unique_name
  ON public.business_competitors (business_id, lower(name));

CREATE INDEX IF NOT EXISTS business_competitors_place_id_idx
  ON public.business_competitors (place_id)
  WHERE place_id IS NOT NULL;

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- All existing accounts now have trial_ends_at = NOW() + 90 days (or their
-- original future date if it was already valid).
-- Run the following to verify:
--
--   SELECT id, account_type, trial_starts_at, trial_ends_at
--   FROM public.profiles
--   ORDER BY created_at DESC
--   LIMIT 20;
