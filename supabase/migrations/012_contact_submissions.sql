-- Migration 012: contact_submissions table
-- Stores messages from the public /contact form.

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL    DEFAULT now(),

  -- Submitter info
  name        text        NOT NULL CHECK (char_length(name) <= 200),
  email       text        NOT NULL CHECK (char_length(email) <= 254),
  company     text                    CHECK (char_length(company) <= 200),
  website     text                    CHECK (char_length(website) <= 500),
  topic       text        NOT NULL    DEFAULT 'other' CHECK (topic IN (
                'product', 'support', 'sales', 'enterprise', 'agency', 'other'
              )),
  message     text        NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 5000),

  -- Internal tracking
  status      text        NOT NULL    DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  notes       text,
  ip_hash     text,       -- SHA-256 of IP for basic rate-limit auditing — never store raw IP

  -- Link to user account if they were logged in
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Only service role can read/write (no public access)
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — submissions are write-only via service role.
-- Admin reads happen through the Supabase dashboard or admin API routes.
CREATE POLICY "service_role_only"
  ON public.contact_submissions
  AS RESTRICTIVE
  USING (false);
