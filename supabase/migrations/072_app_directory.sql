-- Directory entries that override or extend the built-in app catalog, plus outbound click logs.
-- Public pages read through the service role. No browser policies.

create table if not exists public.directory_apps (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  provider text not null check (char_length(trim(provider)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 180),
  website_url text not null check (website_url like 'https://%'),
  affiliate_url text check (affiliate_url is null or affiliate_url like 'https://%'),
  categories text[] not null check (cardinality(categories) >= 1),
  featured boolean not null default false,
  popular boolean not null default false,
  top_pick boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.directory_clicks (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  source text not null check (source in ('homepage', 'directory')),
  destination text not null check (destination in ('affiliate', 'direct')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists directory_clicks_created_at_idx on public.directory_clicks (created_at desc);

alter table public.directory_apps enable row level security;
alter table public.directory_clicks enable row level security;
