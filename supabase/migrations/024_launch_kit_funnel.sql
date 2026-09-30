-- 024_launch_kit_funnel.sql
-- AI Business Launch Kit ($97 one-time) and Agency program ($199/month).
-- Separate from per-business billing_accounts / business_billing_items.
-- Additive only (D-43).

-- ---------------------------------------------------------------------------
-- launch_kit_purchases: one paid kit per Stripe Checkout session
-- ---------------------------------------------------------------------------
create table if not exists public.launch_kit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  amount_cents integer not null default 9700,
  status text not null default 'paid'
    check (status in ('paid', 'refunded')),
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists launch_kit_purchases_user_id_idx
  on public.launch_kit_purchases (user_id);
create index if not exists launch_kit_purchases_email_idx
  on public.launch_kit_purchases (lower(email));

alter table public.launch_kit_purchases enable row level security;

create policy "launch_kit_purchases_select_own"
  on public.launch_kit_purchases
  for select
  to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Writes only via service role (webhooks / claim helper).

-- ---------------------------------------------------------------------------
-- academy_lesson_progress
-- ---------------------------------------------------------------------------
create table if not exists public.academy_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.academy_lesson_progress enable row level security;

create policy "academy_lesson_progress_own"
  on public.academy_lesson_progress
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- agency_program_subscriptions: $199/month software, not auto-enrolled
-- ---------------------------------------------------------------------------
create table if not exists public.agency_program_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'incomplete'
    check (status in ('incomplete', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists agency_program_subscriptions_status_idx
  on public.agency_program_subscriptions (status);

alter table public.agency_program_subscriptions enable row level security;

create policy "agency_program_subscriptions_select_own"
  on public.agency_program_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());
