-- Migration 078: the Actions board and saved reports (dashboard redesign brief, 2026-10-27). Additive only (D-43).
--
-- Actions are the existing opportunities, so the fixes each scan writes keep arriving the same way: "open" is shown as
-- Suggested, the new "todo" is To do, "resolved" is Done. New columns say where to apply a fix, where it came from (a
-- scan, a comparison, the Sources page or the owner), and a key that stops the same fix being added twice.
-- Reports keep frozen snapshots for sharing, so a shared link never changes underneath a client; the live monthly
-- report is worked out on read and not stored.

alter table public.opportunities
  add column if not exists where_to_apply text check (where_to_apply is null or length(where_to_apply) <= 200),
  add column if not exists source text not null default 'scan' check (source in ('scan', 'comparison', 'sources', 'manual')),
  add column if not exists dedupe_key text check (dedupe_key is null or length(dedupe_key) <= 300),
  add column if not exists evidence_data jsonb not null default '{}'::jsonb,
  add column if not exists assignee_id uuid references auth.users (id) on delete set null,
  add column if not exists due_date date,
  add column if not exists completed_at timestamptz;

-- Widen the status list with "todo" (the same pattern as 013 used for categories); every old value stays valid.
alter table public.opportunities drop constraint if exists opportunities_status_check;
alter table public.opportunities
  add constraint opportunities_status_check check (status in ('open', 'todo', 'in_progress', 'resolved', 'dismissed'));

create unique index if not exists opportunities_business_dedupe_key_idx
  on public.opportunities (business_id, dedupe_key) where dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- reports: frozen snapshots of the client report
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  period_start date not null,
  period_end date not null,
  sections jsonb not null default '[]'::jsonb,
  snapshot jsonb not null,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists reports_business_created_idx on public.reports (business_id, created_at desc);

alter table public.reports enable row level security;

-- Owners read their own; writes go through the app's server code (service role), like opportunities (047).
create policy reports_agency_select on public.reports
  for select to authenticated using (
    business_id in (
      select b.id from public.businesses b
      join public.agencies a on a.id = b.agency_id
      where a.owner_user_id = (select auth.uid())
    )
  );

revoke all on public.reports from anon;

-- A share link can point at one snapshot; without one it shows the live report, as before.
alter table public.report_shares
  add column if not exists report_id uuid references public.reports (id) on delete cascade;

-- The report's sections, schedule and branding choices for each business.
alter table public.businesses
  add column if not exists report_settings jsonb not null default '{}'::jsonb;
