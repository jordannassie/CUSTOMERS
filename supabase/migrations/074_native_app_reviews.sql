-- First-party software reviews. Public pages still work if this has not been applied.
-- New reviews stay pending. Only an admin publish makes them count toward the public rating.

create table if not exists public.app_reviews (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'removed')),
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(trim(title)) between 4 and 120),
  use_case text not null check (char_length(trim(use_case)) between 8 and 600),
  pros text not null check (char_length(trim(pros)) between 8 and 800),
  cons text not null check (char_length(trim(cons)) between 8 and 800),
  recommendation text not null check (recommendation in ('yes', 'no')),
  company text check (company is null or char_length(trim(company)) between 1 and 80),
  industry text check (industry is null or char_length(trim(industry)) between 1 and 80),
  job_role text check (job_role is null or char_length(trim(job_role)) between 1 and 80),
  experienced boolean not null check (experienced = true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists app_reviews_one_active_per_user
  on public.app_reviews (user_id, slug)
  where status <> 'removed';

create index if not exists app_reviews_slug_status_idx
  on public.app_reviews (slug, status, published_at desc);

create table if not exists public.app_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.app_reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'duplicate', 'not_a_customer', 'offensive', 'other')),
  details text check (details is null or char_length(trim(details)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create table if not exists public.app_review_votes (
  review_id uuid not null references public.app_reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table if not exists public.app_review_moderation_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.app_reviews (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('submitted', 'edited', 'approved', 'rejected', 'removed', 'reported')),
  note text check (note is null or char_length(note) <= 500),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_review_moderation_events_review_idx
  on public.app_review_moderation_events (review_id, created_at);

alter table public.app_reviews enable row level security;
alter table public.app_review_reports enable row level security;
alter table public.app_review_votes enable row level security;
alter table public.app_review_moderation_events enable row level security;

create policy app_reviews_public_read on public.app_reviews
  for select to anon, authenticated
  using (status = 'published');

create policy app_reviews_owner_read on public.app_reviews
  for select to authenticated
  using (user_id = auth.uid());

create policy app_reviews_owner_insert on public.app_reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and experienced = true
    and exists (
      select 1 from auth.users
      where id = auth.uid() and email_confirmed_at is not null
    )
  );

create policy app_reviews_owner_update on public.app_reviews
  for update to authenticated
  using (user_id = auth.uid() and status <> 'removed')
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and experienced = true
  );

create policy app_review_reports_insert on public.app_review_reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.app_reviews
      where id = review_id and status = 'published' and user_id <> auth.uid()
    )
  );

create policy app_review_reports_select_own on public.app_review_reports
  for select to authenticated
  using (reporter_id = auth.uid());

create policy app_review_votes_own on public.app_review_votes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.app_reviews
      where id = review_id and status = 'published' and user_id <> auth.uid()
    )
  );
