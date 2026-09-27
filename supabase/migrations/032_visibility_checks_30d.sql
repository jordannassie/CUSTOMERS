-- Migration 032: 30-day check aggregates for the score pages (B-30 step 2, D-63, D-64).
-- answer_key is the same for identical answers to the same model, so cached answers count once in the
-- margin; a check with no saved answer text is its own answer. Read by the scores DAL with the service role.

create index if not exists visibility_results_business_created_idx
  on public.visibility_results (business_id, created_at desc);

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
from public.visibility_results r
where r.created_at > now() - interval '30 days';

revoke all on public.visibility_checks_30d from anon, authenticated;
