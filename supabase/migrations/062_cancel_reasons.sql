-- Migration 062: why owners cancel. Additive only (D-43).
--
-- The "Before you cancel" dialog on Billing asks for an optional reason when the owner cancels the plan or takes one
-- business off it. One row per confirmed cancel or removal that gave a reason, so admin can read them on the agency
-- page. Written and read by the service role only: RLS is on with no policies. Rows go with the agency when an
-- account is purged.

create table if not exists public.cancel_reasons (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  kind text not null check (kind in ('cancel', 'remove')),
  reason text not null check (reason in ('too_expensive', 'not_useful', 'just_testing', 'other')),
  created_at timestamptz not null default now()
);

comment on table public.cancel_reasons is
  'Optional reason given in the cancel dialog: kind cancel (the plan) or remove (one business off the plan).';

create index if not exists cancel_reasons_agency_created_idx on public.cancel_reasons (agency_id, created_at desc);

alter table public.cancel_reasons enable row level security;

revoke all on table public.cancel_reasons from anon, authenticated;
