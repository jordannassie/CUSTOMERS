-- One-time AI video ad orders. Prices are written by the server after Stripe confirms them.
-- No public policies: the service role bypasses RLS, and everyone else is denied.

create table if not exists public.video_ad_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  package_id text not null check (package_id in ('starter', 'growth', 'scale')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'paid' check (status in ('paid', 'brief_submitted')),
  customer_name text check (customer_name is null or char_length(customer_name) <= 200),
  email text check (email is null or char_length(email) <= 254),
  business_name text check (business_name is null or char_length(business_name) <= 200),
  website_url text check (website_url is null or char_length(website_url) <= 500),
  product text check (product is null or char_length(product) <= 300),
  audience text check (audience is null or char_length(audience) <= 500),
  creative_instructions text check (creative_instructions is null or char_length(creative_instructions) <= 2000),
  asset_url text check (asset_url is null or char_length(asset_url) <= 500),
  brief_submitted_at timestamptz
);

create index if not exists video_ad_orders_created_at_idx
  on public.video_ad_orders (created_at desc);

alter table public.video_ad_orders enable row level security;
