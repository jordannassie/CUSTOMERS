-- Migration 021: core tables for the MVP (B-11, MVP_SPEC 13, D-20, D-56, D-58, D-61, D-62).
-- Additive only (D-43): nothing existing is changed or dropped.
-- Tables with RLS on and no policy are service role only.

-- ---------------------------------------------------------------------------
-- agencies: the account that owns businesses, credits and the Stripe subscription (D-56)
-- ---------------------------------------------------------------------------
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  logo_url text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'suspended', 'deleted')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- D-61: the worker skips real AI calls for test agencies.
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.agencies enable row level security;

create policy "agencies_owner_select" on public.agencies
  for select to authenticated using (owner_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- plans: prices and limits live here, not in code (D-58)
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id text primary key check (id in ('starter', 'pro', 'enterprise')),
  name text not null,
  price_cents integer check (price_cents >= 0),
  monthly_credits integer check (monthly_credits >= 0),
  max_competitors integer check (max_competitors >= 0),
  max_questions integer check (max_questions >= 0),
  stripe_price_id text unique,
  active boolean not null default true
);

alter table public.plans enable row level security;

-- Prices are public (pricing page).
create policy "plans_select_all" on public.plans
  for select to anon, authenticated using (true);

comment on column public.plans.price_cents is
  'Starter and Pro prices are pending Jordan''s confirmation (D-21).';

insert into public.plans (id, name, price_cents, monthly_credits, max_competitors, max_questions, active)
values
  ('starter', 'Starter', 14900, 1200, 5, 25, true),
  ('pro', 'Pro', 24900, 2500, 10, 25, true),
  ('enterprise', 'Enterprise', null, null, null, null, false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- businesses: new columns (MVP_SPEC 13)
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column if not exists agency_id uuid references public.agencies(id) on delete cascade,
  add column if not exists scan_frequency text not null default 'weekly'
    check (scan_frequency in ('daily', 'weekly', 'monthly')),
  add column if not exists models text[] not null default array['openai', 'anthropic', 'perplexity']
    check (models <@ array['openai', 'anthropic', 'perplexity']),
  add column if not exists next_scan_at timestamptz,
  add column if not exists onboarding_step smallint check (onboarding_step between 0 and 9),
  add column if not exists has_website boolean,
  add column if not exists phone text,
  add column if not exists services text[] not null default '{}',
  add column if not exists aliases text[] not null default '{}',
  -- D-73: the only Google Places value we store.
  add column if not exists places_id text;

create index if not exists businesses_agency_id_idx on public.businesses (agency_id);
create index if not exists businesses_next_scan_at_idx on public.businesses (next_scan_at)
  where next_scan_at is not null;

-- Added alongside the existing owner policy, so agency owners also see their agency's businesses.
create policy "businesses_agency_select" on public.businesses
  for select to authenticated using (
    agency_id in (select a.id from public.agencies a where a.owner_user_id = (select auth.uid()))
  );

alter table public.business_competitors
  add column if not exists places_id text;

-- ---------------------------------------------------------------------------
-- business_subscriptions: one Stripe subscription item per business (D-56)
-- ---------------------------------------------------------------------------
create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  plan_id text not null references public.plans(id),
  stripe_subscription_item_id text unique,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists business_subscriptions_agency_id_idx on public.business_subscriptions (agency_id);

alter table public.business_subscriptions enable row level security;

create policy "business_subscriptions_agency_select" on public.business_subscriptions
  for select to authenticated using (
    agency_id in (select a.id from public.agencies a where a.owner_user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- question_library: reviewed question templates per industry (D-62, MVP_SPEC 5.3)
-- ---------------------------------------------------------------------------
create table if not exists public.question_library (
  id uuid primary key default gen_random_uuid(),
  industry text not null,
  template text not null check (template like '%{city}%'),
  tags text[] not null default '{}',
  intent text not null check (intent in ('best', 'urgent', 'price', 'reviews', 'comparison')),
  version integer not null default 1 check (version >= 1),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists question_library_industry_active_idx on public.question_library (industry)
  where active;

alter table public.question_library enable row level security;

-- ---------------------------------------------------------------------------
-- scan_jobs: the job queue the worker claims from (MVP_SPEC 6)
-- ---------------------------------------------------------------------------
create table if not exists public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  priority integer not null default 0,
  attempts integer not null default 0 check (attempts >= 0),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  -- credit_holds arrives in B-12; the foreign key is added there.
  hold_id uuid,
  credits_charged integer not null default 0 check (credits_charged >= 0),
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- D-55: only one queued or running job per business.
create unique index if not exists scan_jobs_one_active_per_business_idx on public.scan_jobs (business_id)
  where status in ('queued', 'running');
create index if not exists scan_jobs_claim_idx on public.scan_jobs (priority desc, created_at)
  where status = 'queued';
create index if not exists scan_jobs_agency_id_idx on public.scan_jobs (agency_id);

alter table public.scan_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- ai_answer_cache: shared 24-hour answer cache (D-24, MVP_SPEC 5.4)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_answer_cache (
  cache_key text primary key,
  model text not null,
  question text not null,
  location text not null,
  answer text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists ai_answer_cache_created_at_idx on public.ai_answer_cache (created_at);

alter table public.ai_answer_cache enable row level security;

-- ---------------------------------------------------------------------------
-- report_shares: read-only share links /r/<token> (D-12)
-- ---------------------------------------------------------------------------
create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  token text not null unique check (length(token) >= 32),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists report_shares_business_id_idx on public.report_shares (business_id);

alter table public.report_shares enable row level security;

create policy "report_shares_agency_select" on public.report_shares
  for select to authenticated using (
    business_id in (
      select b.id from public.businesses b
      join public.agencies a on a.id = b.agency_id
      where a.owner_user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- system_alerts (MVP_SPEC 22)
-- ---------------------------------------------------------------------------
create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  message text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  resolved_at timestamptz
);

create index if not exists system_alerts_open_idx on public.system_alerts (kind, created_at desc)
  where resolved_at is null;

alter table public.system_alerts enable row level security;

-- ---------------------------------------------------------------------------
-- admin_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Kept when the admin's user is deleted, so the history survives.
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- business_site_facts: Firecrawl facts about the business's own site only
-- ---------------------------------------------------------------------------
create table if not exists public.business_site_facts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  data jsonb not null default '{}',
  fetched_at timestamptz not null default now()
);

alter table public.business_site_facts enable row level security;

create policy "business_site_facts_agency_select" on public.business_site_facts
  for select to authenticated using (
    business_id in (
      select b.id from public.businesses b
      join public.agencies a on a.id = b.agency_id
      where a.owner_user_id = (select auth.uid())
    )
  );

-- Service role only: no direct access for signed-in users or visitors.
revoke all on public.question_library, public.scan_jobs, public.ai_answer_cache,
  public.system_alerts, public.admin_audit_log
  from anon, authenticated;
