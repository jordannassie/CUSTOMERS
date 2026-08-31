-- Migration 018: Fix contact_submissions constraints and add read/unread tracking.
-- Idempotent — safe to re-run.

-- 1. Add read_at for read/unread tracking (NULL = unread)
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2. Relax message minimum length.
--    The original table defined: CHECK (char_length(message) >= 10 AND char_length(message) <= 5000)
--    PostgreSQL auto-names this contact_submissions_message_check.
--    We drop it and recreate with minimum = 1 (non-empty after server trim).
ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_message_check;

ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_message_check
    CHECK (char_length(message) >= 1 AND char_length(message) <= 5000);

-- 3. Widen topic constraint to include ai_visibility and chatgpt_ads.
--    Migration 013 attempted this but the original inline constraint
--    auto-named contact_submissions_topic_check may still be present.
ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_topic_check;

ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_topic_check
    CHECK (topic IN (
      'product', 'support', 'sales', 'enterprise',
      'ai_visibility', 'chatgpt_ads', 'agency', 'book_demo', 'other'
    ));

-- 4. Extend status values to match sales pipeline.
--    Original: 'new', 'in_progress', 'resolved'
--    Adding:   'contacted', 'qualified', 'closed'
ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_status_check;

ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_status_check
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'in_progress', 'resolved'));

-- 5. Ensure source and page_path columns exist (from migration 013, may not be applied)
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS source    TEXT,
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT;

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_unread
  ON public.contact_submissions (created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_topic
  ON public.contact_submissions (topic);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status
  ON public.contact_submissions (status);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_source
  ON public.contact_submissions (source);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON public.contact_submissions (created_at DESC);

-- RLS: service role bypasses by default; restrictive policy prevents public reads.
-- No change required — existing policy remains.
