-- Migration 039: shared per-IP rate limit counts for the public endpoints (SEC-07, B-82 follow-up).
-- Additive only (D-43). Replaces the per-instance memory counts, which each serverless instance kept on its own.

-- ---------------------------------------------------------------------------
-- rate_limit_hits: one row per key per fixed window. The key is "<bucket>:<sha256 of the IP>", never the raw IP.
-- RLS stays on with no policies: only the service role reaches it, through rate_limit_hit().
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_hits (
  key text not null check (length(key) <= 100),
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limit_hits_window_start_idx on public.rate_limit_hits (window_start);

alter table public.rate_limit_hits enable row level security;

-- ---------------------------------------------------------------------------
-- rate_limit_hit: counts one hit and returns the count in this window, including this hit. One statement, so
-- parallel hits on the same key never lose a count.
-- ---------------------------------------------------------------------------
create or replace function public.rate_limit_hit(p_key text, p_window_start timestamptz)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.rate_limit_hits (key, window_start)
  values (p_key, p_window_start)
  on conflict (key, window_start) do update set count = public.rate_limit_hits.count + 1
  returning count;
$$;

revoke all on function public.rate_limit_hit(text, timestamptz) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, timestamptz) to service_role;

-- Windows are at most an hour, so rows older than a day count for nothing.
select cron.schedule('purge-rate-limit-hits', '15 * * * *', $$delete from public.rate_limit_hits where window_start < now() - interval '1 day'$$);
