-- Newsletter section impressions and signup link clicks. A click is not a subscriber.
-- Public pages still work if this has not been applied.

create table if not exists public.newsletter_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('impression', 'click', 'confirmed')),
  placement text not null check (placement in ('homepage', 'directory', 'detail', 'footer', 'nav')),
  created_at timestamptz not null default now()
);

create index if not exists newsletter_events_created_at_idx on public.newsletter_events (created_at desc);

alter table public.newsletter_events enable row level security;
