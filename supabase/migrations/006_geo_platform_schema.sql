-- Migration 006: Customers.Direct AI Search Visibility / GEO / AEO platform (V1)
-- New end-user-facing schema. Distinct from the admin/service-role-only tables in
-- 001-005: these tables are read/written directly by authenticated users via
-- Supabase Auth, so every table carries owner-scoped RLS keyed off auth.uid().

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  account_type text not null default 'business',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  description text,
  reach_type text,
  primary_country text,
  primary_region text,
  primary_city text,
  language text not null default 'en',
  logo_url text,
  status text not null default 'onboarding'
    check (status in ('onboarding', 'scanning', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_user_id_idx on public.businesses (owner_user_id);

alter table public.businesses enable row level security;

create policy "businesses_owner_all" on public.businesses
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- ---------------------------------------------------------------------------
-- business_competitors
-- ---------------------------------------------------------------------------
create table if not exists public.business_competitors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  domain text,
  source text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists business_competitors_business_id_idx on public.business_competitors (business_id);

alter table public.business_competitors enable row level security;

create policy "business_competitors_owner_all" on public.business_competitors
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- tracked_prompts
-- ---------------------------------------------------------------------------
create table if not exists public.tracked_prompts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prompt text not null,
  category text,
  buyer_intent text,
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tracked_prompts_business_id_idx on public.tracked_prompts (business_id);

alter table public.tracked_prompts enable row level security;

create policy "tracked_prompts_owner_all" on public.tracked_prompts
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- visibility_runs: one scan/run
-- ---------------------------------------------------------------------------
create table if not exists public.visibility_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists visibility_runs_business_id_idx on public.visibility_runs (business_id);

alter table public.visibility_runs enable row level security;

create policy "visibility_runs_owner_select" on public.visibility_runs
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- visibility_results: normalized per-prompt-per-provider result
-- ---------------------------------------------------------------------------
create table if not exists public.visibility_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.visibility_runs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  tracked_prompt_id uuid references public.tracked_prompts(id) on delete cascade,
  provider text not null,
  raw_response jsonb,
  business_mentioned boolean not null default false,
  mention_position integer,
  competitors_mentioned jsonb not null default '[]'::jsonb,
  cited_sources jsonb not null default '[]'::jsonb,
  sentiment text,
  methodology text,
  created_at timestamptz not null default now()
);

create index if not exists visibility_results_business_id_idx on public.visibility_results (business_id);
create index if not exists visibility_results_run_id_idx on public.visibility_results (run_id);
create index if not exists visibility_results_prompt_id_idx on public.visibility_results (tracked_prompt_id);

alter table public.visibility_results enable row level security;

create policy "visibility_results_owner_select" on public.visibility_results
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- visibility_scores: Direct Score history
-- ---------------------------------------------------------------------------
create table if not exists public.visibility_scores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  mention_rate numeric,
  citation_rate numeric,
  prompts_won integer,
  prompts_tested integer,
  competitor_share numeric,
  calculated_at timestamptz not null default now()
);

create index if not exists visibility_scores_business_id_idx on public.visibility_scores (business_id, calculated_at desc);

alter table public.visibility_scores enable row level security;

create policy "visibility_scores_owner_select" on public.visibility_scores
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  evidence text,
  impact text not null default 'medium' check (impact in ('high', 'medium', 'low')),
  category text not null check (category in (
    'content', 'service_page', 'technical', 'structured_data',
    'entity_consistency', 'citations', 'reviews_reputation',
    'local_presence', 'competitor_gap'
  )),
  affected_url text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'dismissed')),
  recommended_action text,
  claude_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_business_id_idx on public.opportunities (business_id);

alter table public.opportunities enable row level security;

create policy "opportunities_owner_all" on public.opportunities
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- service_requests: "Have Customers.Direct Fix It"
-- ---------------------------------------------------------------------------
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  requested_by uuid not null references auth.users(id),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'in_progress', 'completed', 'declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_business_id_idx on public.service_requests (business_id);

alter table public.service_requests enable row level security;

create policy "service_requests_owner_select" on public.service_requests
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );
create policy "service_requests_owner_insert" on public.service_requests
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- subscriptions: Stripe-ready, one row per business
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null default 'none' check (plan in ('none', 'ai_visibility', 'growth_agent', 'autonomous_growth')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_business_id_idx on public.subscriptions (business_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions_owner_select" on public.subscriptions
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

-- Service role (used by server-side webhook/cron code) bypasses RLS on all of the above.
