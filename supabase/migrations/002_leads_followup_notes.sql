-- Migration 002: Add follow-up tracking and private notes to existing leads table
-- The `status` column already exists (default 'new') — do NOT recreate it.

ALTER TABLE public.customers_direct_leads
  ADD COLUMN IF NOT EXISTS notes          text,
  ADD COLUMN IF NOT EXISTS followed_up_at timestamptz;
