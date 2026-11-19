-- Migration 077: what competitors' own websites say (B-91, Phase B of "why you are behind"). Additive only (D-43).
--
-- One row per website domain, read when an owner asks ("Check their website"), at most once in 30 days, and shared by
-- every business that tracks the same competitor: a site is public, so a second agency never pays to read it again.
-- Only the site's own words are kept (services with the page they were found on, whether it shows a phone or an
-- address); nothing from Google is stored here (D-73).

-- ---------------------------------------------------------------------------
-- website_facts. RLS stays on with no policies: only the service role reaches it, from a module's dal.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.website_facts (
  domain text primary key check (domain = lower(domain) and length(domain) between 4 and 253 and domain like '%.%'),
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.website_facts enable row level security;

revoke all on public.website_facts from anon, authenticated;
