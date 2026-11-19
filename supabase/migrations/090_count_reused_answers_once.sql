-- 090: each answer counts once, and only from finished scans (QA 2026-11-01, D-24, D-64, D-91).
--
-- A Run scan within 20 hours reuses the answers from the shared cache for free (D-24), but saved each one again as a
-- new visibility_results row of the new scan. Every count read kept both rows, so one reused rescan doubled the answer
-- counts on the Overview, report, PDF, email, Competitors and Questions pages ("36 of 44 answers" for 22 answers). A
-- copy of an answer this business already has is the same AI answer, not new evidence: it counts once, from its first
-- row. A cached answer that first came from another business's scan is new for this business and still counts.
--
-- While a scan runs, its rows were counted as they arrived, so a first scan showed "100 of 100" from one answer. Rows of
-- a run whose scan job is still queued or running wait until the scan finishes. A run left running by a job that failed
-- for good still counts: its answers were charged.
--
-- Additive only (D-43): a new view, and the two views over it re-created with the same columns (as 044 did to 032).
-- Server-only, like visibility_results_counted. Test agencies' recorded answers repeat with cached = false, so they are
-- never folded together.

create or replace view public.visibility_results_unique with (security_invoker = true) as
select r.*
from public.visibility_results_counted r
where not (
    r.cached and exists (
      select 1
      from public.visibility_results e
      where e.business_id = r.business_id
        and e.provider = r.provider
        and e.tracked_prompt_id is not distinct from r.tracked_prompt_id
        and e.answer_text = r.answer_text
        and e.created_at < r.created_at
        -- Copies of one cache entry are under 20 hours apart (cache.ts).
        and e.created_at > r.created_at - interval '1 day'
    )
  )
  and not exists (
    select 1
    from public.visibility_runs vr
    join public.scan_jobs j on j.id = vr.scan_job_id
    where vr.id = r.run_id and vr.status = 'running' and j.status in ('queued', 'running')
  );

revoke all on public.visibility_results_unique from anon, authenticated;

comment on view public.visibility_results_unique is
  'Counted answers, each once: no copies saved by a reused Run scan, no rows of a scan still running. Server-only.';

-- Same columns as migration 044, now over the answers that count once.
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
from public.visibility_results_unique r
where r.created_at > now() - interval '30 days';

revoke all on public.visibility_checks_30d from anon, authenticated;

-- Same columns as migration 088, now over the answers that count once.
create or replace view public.visibility_checks_all with (security_invoker = true) as
select
  r.id,
  r.business_id,
  r.provider,
  coalesce(r.tracked_prompt_id::text, 'none') as question_id,
  r.created_at as checked_at,
  r.business_mentioned,
  coalesce(md5(r.provider || r.answer_text), r.id::text) as answer_key,
  coalesce(
    (
      select array_agg(c ->> 'name')
      from jsonb_array_elements(case when jsonb_typeof(r.competitors_mentioned) = 'array' then r.competitors_mentioned end) c
      where c ->> 'name' is not null
    ),
    '{}'
  ) as competitors,
  r.competitors_mentioned,
  r.extracted_names,
  r.cited_sources
from public.visibility_results_unique r;

revoke all on public.visibility_checks_all from anon, authenticated;
