-- 088: visibility_checks_all, the counted answers without their text.
--
-- The Overview, Competitors and Sources pages read every answer of the last 30 to 180 days only to tell repeated answers
-- apart, and downloaded each answer's full text to do it (about 1.5 KB per answer, several times per page). This view
-- gives the same answer key as visibility_checks_30d (migrations 032 and 044) over all the rows that count, with the
-- small columns those pages use, so the text never leaves the database for them.
--
-- Additive only (D-43): a new view. Server-only, like visibility_results_counted.

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
from public.visibility_results_counted r;

revoke all on public.visibility_checks_all from anon, authenticated;

comment on view public.visibility_checks_all is
  'Counted answers (visibility_results_counted) without answer_text: the answer key of visibility_checks_30d over any range. Server-only.';
