-- ---------------------------------------------------------------------------
-- 014_feature_requests.sql
-- Simple feature request / feedback table for beta users.
-- ---------------------------------------------------------------------------

create table if not exists public.feature_requests (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  business_id uuid        references public.businesses(id) on delete set null,
  title       text        not null check (char_length(trim(title)) >= 1 and char_length(title) <= 200),
  description text        not null check (char_length(trim(description)) >= 1 and char_length(description) <= 2000),
  page_context text,
  status      text        not null default 'new'
                          check (status in ('new', 'reviewing', 'planned', 'shipped', 'declined')),
  created_at  timestamptz not null default now()
);

create index if not exists feature_requests_user_id_idx    on public.feature_requests (user_id);
create index if not exists feature_requests_status_idx     on public.feature_requests (status);
create index if not exists feature_requests_created_at_idx on public.feature_requests (created_at desc);

alter table public.feature_requests enable row level security;

-- Authenticated users can INSERT their own requests
create policy "feature_requests_insert"
  on public.feature_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can only SELECT their own requests
create policy "feature_requests_select_own"
  on public.feature_requests
  for select
  to authenticated
  using (user_id = auth.uid());

-- No UPDATE or DELETE for regular users — admin uses service role
