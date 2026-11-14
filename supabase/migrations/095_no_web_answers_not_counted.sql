-- Migration 095: answers that say the AI has no web access stop counting (QA round 2, item 4, 2026-11-13).
-- Additive (D-43): one view redefined with the same columns, no data changed.
--
-- An answer that opens with "I don't have access to current, real-time information..." and cites no source did not look
-- anything up, so it says nothing about whether the AI recommends the business. New ones now fail the check and are
-- never charged (src/modules/scanning/no-web.ts). Answers saved before that are left as they are, and this view, which
-- every score, the Sources page and "Also recommended" read, leaves them out. The pattern matches no-web.ts: the first
-- 300 characters, lower case, curly apostrophes made straight, and only when no source was cited. Change both together.

create or replace view public.visibility_results_counted with (security_invoker = true) as
select
  r.id,
  r.run_id,
  r.business_id,
  r.tracked_prompt_id,
  r.provider,
  r.raw_response,
  r.business_mentioned,
  r.mention_position,
  r.competitors_mentioned,
  r.cited_sources,
  r.sentiment,
  r.methodology,
  r.created_at,
  r.model,
  r.question,
  r.answer_text,
  r.cached,
  r.cost_usd,
  r.latency_ms,
  r.extracted_names,
  r.is_sample
from public.visibility_results r
where (
    not r.is_sample
    or exists (
      select 1
      from public.businesses b
      join public.agencies a on a.id = b.agency_id
      where b.id = r.business_id and a.is_test
    )
  )
  and not coalesce(
    (jsonb_typeof(r.cited_sources) is distinct from 'array' or r.cited_sources = '[]'::jsonb)
    and lower(translate(left(r.answer_text, 300), '‘’', '''''')) ~ $re$\yi(?: don't| do not| can't| cannot| am unable to|'m unable to| am not able to|'m not able to)(?: currently)? (?:have )?(?:access|browse|search|look up|retrieve|check)\y[^.]{0,60}\y(?:real-time|real time|current|live|up-to-date|up to date|internet|web|online)|\yi (?:don't|do not) have (?:real-time|real time|current|live|up-to-date|up to date) (?:information|data|access)|\ymy (?:knowledge|training data)(?: has a)? (?:cutoff|cut-off|only goes)$re$,
    false
  );

-- Same grants as before (migration 094): service role only; the view stays closed to anon and authenticated.
grant select, insert, update, delete on table public.visibility_results_counted to service_role;
