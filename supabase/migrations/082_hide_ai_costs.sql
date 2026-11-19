-- 082: customers never see what their AI checks cost us. Additive in effect: no data changes, only who can read what.
--
-- usage_events holds the tokens and dollar cost of every AI call. Only the server reads it (the service role, for the
-- admin usage and cost page), so logged-in users lose their read policy and all grants on it.
-- visibility_results.cost_usd is what one check cost. Owners keep reading their own answers (RLS unchanged), but
-- through a column list without cost_usd. The visibility_results_counted view stays server-only, as migration 044 made it.
--
-- A column added to visibility_results later is not readable by logged-in users until it is granted here too. The
-- app reads answers with the service role, so this only matters for a new read made with the user's own login.

drop policy if exists usage_events_select_own on public.usage_events;
revoke all on public.usage_events from anon, authenticated;

revoke select on public.visibility_results from anon, authenticated;
grant select (
  id, run_id, business_id, tracked_prompt_id, provider, raw_response, business_mentioned, mention_position,
  competitors_mentioned, cited_sources, sentiment, methodology, created_at, model, question, answer_text, cached,
  latency_ms, extracted_names, is_sample
) on public.visibility_results to authenticated;

-- visibility_results_counted is read only by the server (migration 044 revoked it); keep it that way.
revoke all on public.visibility_results_counted from anon, authenticated;
