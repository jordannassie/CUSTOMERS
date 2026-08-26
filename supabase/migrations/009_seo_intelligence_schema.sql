-- Migration 009: SEO intelligence layer (DataForSEO-backed) for the
-- Customers.Direct AI Search Visibility (GEO/AEO) platform.
--
-- This is additive only — it does not touch any table created by
-- 001-008. Every new table follows the same owner-scoped RLS pattern
-- already used by business_competitors/tracked_prompts/opportunities in
-- 006_geo_platform_schema.sql: a "for all" policy keyed through
-- businesses.owner_user_id, not a split select-only policy. (Migration 007
-- had to backfill missing insert/update policies on three GEO tables that
-- shipped select-only — this migration deliberately avoids repeating that
-- mistake by using "for all" everywhere from the start.)

-- ---------------------------------------------------------------------------
-- seo_domain_snapshots: point-in-time domain overview (organic visibility,
-- estimated traffic, referring domains/backlinks, authority-equivalent rank)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_domain_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  domain text not null,
  organic_keywords integer,
  estimated_traffic integer,
  estimated_traffic_value numeric,
  referring_domains integer,
  backlinks integer,
  domain_rank integer,
  provider text not null default 'dataforseo',
  raw_data jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists seo_domain_snapshots_business_id_idx
  on public.seo_domain_snapshots (business_id, captured_at desc);

alter table public.seo_domain_snapshots enable row level security;

create policy "seo_domain_snapshots_owner_all" on public.seo_domain_snapshots
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- seo_keywords: discovered/tracked keywords for a business's own domain.
-- One row per (business_id, keyword, location) — re-discovery upserts and
-- shifts current_position -> previous_position rather than duplicating rows.
-- ---------------------------------------------------------------------------
create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  keyword text not null,
  search_volume integer,
  difficulty integer,
  cpc numeric,
  intent text,
  current_position integer,
  previous_position integer,
  ranking_url text,
  -- not null, default '' (not a nullable free-text field) so the unique
  -- index below can dedupe reliably — see note there.
  location text not null default '',
  provider text not null default 'dataforseo',
  tracked boolean not null default false,
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- location is written as '' (never null) by the app whenever no city/region
-- is on file, specifically so this plain-column unique constraint works with
-- a normal upsert onConflict target — a unique index on a nullable column
-- would treat every NULL as distinct and silently stop deduplicating.
create unique index if not exists seo_keywords_business_keyword_location_idx
  on public.seo_keywords (business_id, keyword, location);
create index if not exists seo_keywords_business_id_idx on public.seo_keywords (business_id);

alter table public.seo_keywords enable row level security;

create policy "seo_keywords_owner_all" on public.seo_keywords
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- seo_competitor_keywords: keyword gaps between the business and a tracked
-- competitor (competitor ranks, business doesn't — or ranks worse).
-- ---------------------------------------------------------------------------
create table if not exists public.seo_competitor_keywords (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  competitor_id uuid not null references public.business_competitors(id) on delete cascade,
  keyword text not null,
  search_volume integer,
  difficulty integer,
  competitor_position integer,
  business_position integer,
  competitor_url text,
  opportunity_score numeric,
  captured_at timestamptz not null default now()
);

create index if not exists seo_competitor_keywords_business_id_idx
  on public.seo_competitor_keywords (business_id);
create index if not exists seo_competitor_keywords_competitor_id_idx
  on public.seo_competitor_keywords (competitor_id);

alter table public.seo_competitor_keywords enable row level security;

create policy "seo_competitor_keywords_owner_all" on public.seo_competitor_keywords
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- seo_referring_domains: opportunity-oriented backlink summary. Stores one
-- row per referring domain rather than a raw per-link dump — target
-- distinguishes "links to this business" from "links to this tracked
-- competitor" so the backlinks dashboard can compute gap opportunities
-- (domains that link to competitors but not to the business) from one table.
-- ---------------------------------------------------------------------------
create table if not exists public.seo_referring_domains (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  domain text not null,
  target text not null default 'business' check (target in ('business', 'competitor')),
  competitor_id uuid references public.business_competitors(id) on delete cascade,
  backlinks integer,
  first_seen date,
  domain_rank integer,
  provider text not null default 'dataforseo',
  captured_at timestamptz not null default now()
);

create index if not exists seo_referring_domains_business_id_idx
  on public.seo_referring_domains (business_id);
create index if not exists seo_referring_domains_domain_idx
  on public.seo_referring_domains (business_id, domain);

alter table public.seo_referring_domains enable row level security;

create policy "seo_referring_domains_owner_all" on public.seo_referring_domains
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- seo_runs: one SEO analysis execution (mirrors visibility_runs).
-- ---------------------------------------------------------------------------
create table if not exists public.seo_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null default 'full'
    check (type in ('full', 'domain_overview', 'keywords', 'competitors', 'backlinks')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  provider text not null default 'dataforseo',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists seo_runs_business_id_idx on public.seo_runs (business_id, started_at desc);

alter table public.seo_runs enable row level security;

create policy "seo_runs_owner_all" on public.seo_runs
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- seo_api_usage: per-call cost/usage ledger so we know cost per customer.
-- ---------------------------------------------------------------------------
create table if not exists public.seo_api_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  run_id uuid references public.seo_runs(id) on delete set null,
  provider text not null default 'dataforseo',
  endpoint text not null,
  units integer not null default 1,
  estimated_cost numeric,
  created_at timestamptz not null default now()
);

create index if not exists seo_api_usage_business_id_idx on public.seo_api_usage (business_id, created_at desc);

alter table public.seo_api_usage enable row level security;

create policy "seo_api_usage_owner_all" on public.seo_api_usage
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Extend opportunities (from 006) so SEO opportunities can live alongside
-- AI-visibility opportunities in the same unified list, per product design
-- ("Unified Opportunities" — Phase 7). Additive: existing rows default to
-- source='ai_visibility', so nothing already stored changes meaning.
-- ---------------------------------------------------------------------------
alter table public.opportunities
  add column if not exists source text not null default 'ai_visibility'
    check (source in ('ai_visibility', 'seo'));

alter table public.opportunities drop constraint if exists opportunities_category_check;
alter table public.opportunities add constraint opportunities_category_check
  check (category in (
    'content', 'service_page', 'technical', 'structured_data',
    'entity_consistency', 'citations', 'reviews_reputation',
    'local_presence', 'competitor_gap',
    'seo_keyword_gap', 'seo_competitor_gap', 'seo_backlink_gap',
    'seo_technical', 'seo_content', 'seo_ranking_opportunity'
  ));

-- Service role (used by server-side cron code) bypasses RLS on all of the above.
