-- Migration 034: top-up packs and Stripe product IDs (B-40, MVP_SPEC 4.1, 11.4, D-22, D-56).
-- Additive only (D-43). Prices live here, not in code, so a price change needs no deploy.
-- Stripe IDs are filled by scripts/dev/stripe-catalog-sync.dev.ts, per project (sandbox for dev, live for live).

-- ---------------------------------------------------------------------------
-- plans: Stripe product ID next to the existing stripe_price_id
-- ---------------------------------------------------------------------------
alter table public.plans
  add column if not exists stripe_product_id text unique;

-- ---------------------------------------------------------------------------
-- topup_packs: one-time credit packs (D-22)
-- ---------------------------------------------------------------------------
create table if not exists public.topup_packs (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  credits integer not null check (credits > 0),
  price_cents integer not null check (price_cents > 0),
  stripe_product_id text unique,
  stripe_price_id text unique,
  sort_order smallint not null default 0,
  active boolean not null default true
);

alter table public.topup_packs enable row level security;

-- Prices are public (pricing page). Writes only by the service role.
create policy "topup_packs_select_all" on public.topup_packs
  for select to anon, authenticated using (true);

comment on column public.topup_packs.price_cents is
  'Top-up prices are Proposed and pending Jordan''s confirmation (D-22).';

insert into public.topup_packs (id, name, credits, price_cents, sort_order, active)
values
  ('topup_500', '500 credits', 500, 5000, 1, true),
  ('topup_2000', '2,000 credits', 2000, 18000, 2, true)
on conflict (id) do nothing;
