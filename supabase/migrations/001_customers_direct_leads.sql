-- Create leads table for Customers.Direct strategy call form
create table if not exists public.customers_direct_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  business_name text not null,
  website text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- Index for admin query (newest first)
create index if not exists customers_direct_leads_created_at_idx
  on public.customers_direct_leads (created_at desc);

-- RLS: enable but public cannot select
alter table public.customers_direct_leads enable row level security;

-- No policy for anon/public select — service role bypasses RLS
-- Service role key used server-side for all reads/writes
