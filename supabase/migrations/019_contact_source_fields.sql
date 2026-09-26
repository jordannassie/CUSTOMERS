-- Migration 013: Add source, page_path, and phone to contact_submissions.
-- Also widens the topic check constraint to support new interest values.
-- Idempotent — safe to re-run.

-- Add new columns if they don't already exist
ALTER TABLE contact_submissions
  ADD COLUMN IF NOT EXISTS source    TEXT,
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT;

-- Drop the old check constraint (may not exist in all environments)
ALTER TABLE contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_topic_check;

-- Recreate with extended allowed values
-- Old values preserved for historical records; new values added.
ALTER TABLE contact_submissions
  ADD CONSTRAINT contact_submissions_topic_check
  CHECK (topic IN (
    'product', 'support', 'sales', 'enterprise', 'agency',
    'ai_visibility', 'chatgpt_ads', 'other'
  ));

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_source     ON contact_submissions (source);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions (created_at DESC);

-- RLS: ensure the service role can insert/select (it bypasses RLS by default).
-- Public users must NOT be able to read any contact submissions.
-- (Existing RLS policies remain intact — this migration adds no new policies.)
