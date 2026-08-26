-- Migration 009: SEO intelligence snapshot storage
-- Stores cached DataForSEO results per business (one current snapshot per business).
-- Refreshed on demand or weekly by the monitoring cron.

create table if not exists public.seo_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references public.businesses(id) on delete cascade,
  domain          text        not null,
  -- Normalized overview metrics (keywords count, estimated traffic, etc.)
  overview        jsonb       not null default '{}',
  -- Ranked keyword rows: [{keyword, position, search_volume, difficulty, url, change}]
  top_keywords    jsonb       not null default '[]',
  -- SEO competitor data: [{domain, keywords, traffic}]
  competitors     jsonb       not null default '[]',
  -- Backlink summary: {referring_domains, backlinks, rank}
  backlinks       jsonb       not null default '{}',
  -- Keyword gaps vs competitors: [{keyword, competitor, volume, difficulty}]
  keyword_gaps    jsonb       not null default '[]',
  -- Raw provider response stored for debugging (not shown to users)
  raw_response    jsonb       null,
  fetched_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Only one snapshot per business (latest replaces previous via upsert)
create unique index if not exists seo_snapshots_business_id_key
  on public.seo_snapshots(business_id);

create index if not exists seo_snapshots_fetched_at_idx
  on public.seo_snapshots(business_id, fetched_at desc);

-- Row-Level Security
alter table public.seo_snapshots enable row level security;

create policy "owner_select_seo_snapshots"
  on public.seo_snapshots for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = seo_snapshots.business_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "owner_insert_seo_snapshots"
  on public.seo_snapshots for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = seo_snapshots.business_id
        and b.owner_user_id = auth.uid()
    )
  );

create policy "owner_update_seo_snapshots"
  on public.seo_snapshots for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = seo_snapshots.business_id
        and b.owner_user_id = auth.uid()
    )
  );

-- Service role bypass (for cron-triggered SEO refreshes)
create policy "service_role_all_seo_snapshots"
  on public.seo_snapshots for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
