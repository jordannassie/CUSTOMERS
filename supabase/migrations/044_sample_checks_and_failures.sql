-- Migration 044: sample answers stay out of real numbers (BUG-075), and each scan records which AI failed
-- (BUG-074). Additive only (D-43).
--
-- 1. visibility_results.is_sample: true for recorded answers saved for a test agency (D-61). They count only
--    while the agency is still a test agency, so switching an agency to real drops them from every score.
-- 2. visibility_runs.failed_by_provider: failed checks per AI for the run, with the first reason, so the
--    Overview can say "Claude couldn't be checked" instead of hiding the AI.
-- 3. visibility_results_counted: the rows that count, read by the score, sources and "Also recommended" pages.

alter table public.visibility_results add column if not exists is_sample boolean not null default false;

comment on column public.visibility_results.is_sample is
  'A recorded answer saved for a test agency (D-61), not a real AI answer. Counted only while the agency is a test agency.';

alter table public.visibility_runs add column if not exists failed_by_provider jsonb;

comment on column public.visibility_runs.failed_by_provider is
  'Failed checks per AI for this run: {"anthropic": {"failed": 12, "reason": "..."}}. Null when nothing failed or for runs before migration 044.';

-- Recorded answers are the only checks saved with exactly zero cost and zero latency; real answers always take
-- time, and older rows from the legacy flow leave both empty.
update public.visibility_results
set is_sample = true
where not is_sample and not cached and cost_usd = 0 and latency_ms = 0;

create or replace view public.visibility_results_counted with (security_invoker = true) as
select r.*
from public.visibility_results r
where not r.is_sample
  or exists (
    select 1
    from public.businesses b
    join public.agencies a on a.id = b.agency_id
    where b.id = r.business_id and a.is_test
  );

revoke all on public.visibility_results_counted from anon, authenticated;

-- Same columns as migration 032, now over the rows that count.
create or replace view public.visibility_checks_30d with (security_invoker = true) as
select
  r.id,
  r.business_id,
  r.provider,
  coalesce(r.tracked_prompt_id::text, 'none') as question_id,
  r.created_at as checked_at,
  r.business_mentioned,
  r.cached,
  coalesce(md5(r.provider || r.answer_text), r.id::text) as answer_key,
  coalesce(
    (
      select array_agg(c ->> 'name')
      from jsonb_array_elements(case when jsonb_typeof(r.competitors_mentioned) = 'array' then r.competitors_mentioned end) c
      where c ->> 'name' is not null
    ),
    '{}'
  ) as competitors
from public.visibility_results_counted r
where r.created_at > now() - interval '30 days';

revoke all on public.visibility_checks_30d from anon, authenticated;
