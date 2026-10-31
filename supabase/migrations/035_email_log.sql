-- Migration 035: email log and email preferences (B-61, MVP_SPEC 10, D-37, D-72).
-- Additive only (D-43).

-- ---------------------------------------------------------------------------
-- agencies: email preferences (weekly report on or off)
-- ---------------------------------------------------------------------------
alter table public.agencies
  add column if not exists weekly_report_emails boolean not null default true;

-- ---------------------------------------------------------------------------
-- email_log: one row per email we tried to send
-- ---------------------------------------------------------------------------
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  type text not null
    check (type in ('welcome', 'trial_ending', 'payment_failed', 'low_credits', 'weekly_report')),
  to_email text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  -- Set by triggers that must send once per event (B-62); a repeat event finds the sent row and stops.
  idempotency_key text,
  sent_at timestamptz not null default now()
);

create unique index if not exists email_log_idempotency_key_sent_idx
  on public.email_log (idempotency_key) where status = 'sent';
create index if not exists email_log_agency_id_sent_at_idx on public.email_log (agency_id, sent_at desc);

-- Written and read only by the service role; no policies for signed-in users.
alter table public.email_log enable row level security;
