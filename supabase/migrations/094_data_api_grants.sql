-- Migration 094: explicit Data API grants for every table and view made in migrations 021 to 093 (2026-11-13).
-- Additive (D-43): grants only, nothing is revoked or dropped.
--
-- Supabase stopped granting new public tables to anon, authenticated and service_role by default on every existing
-- project on 2026-10-30 (changelog 45329; F-09). Tables that already existed keep their grants, but live has only
-- migrations 001 to 020, so every table and view that 021 to 093 create would arrive with no grants and the app would
-- get "permission denied for table ..." (42501), service role included.
--
-- The grants below are the ones each table had when 021 to 093 ran under the old default and then applied their own
-- revokes (read from a local database built from these migrations on 2026-11-13), so the result on live is exactly what
-- the migrations meant. Only select, insert, update and delete are granted, as Supabase now recommends. RLS still
-- decides which rows a role sees. None of these tables uses a sequence (uuid keys), so no sequence grants are needed.
-- Running it on a database that still had the old default changes nothing.
--
-- From 095 on, every migration that creates a table or view grants it itself (scripts/check-migration-rls.ts checks).

-- account_purges (table)
grant select on table public.account_purges to anon;
grant select on table public.account_purges to authenticated;
grant select, insert, update, delete on table public.account_purges to service_role;

-- admin_audit_log (table)
grant select, insert, update, delete on table public.admin_audit_log to service_role;

-- agencies (table)
grant select on table public.agencies to anon;
grant select on table public.agencies to authenticated;
grant select, insert, update, delete on table public.agencies to service_role;

-- agency_credit_balance (view)
grant select on table public.agency_credit_balance to authenticated;
grant select, insert, update, delete on table public.agency_credit_balance to service_role;

-- ai_answer_cache (table)
grant select, insert, update, delete on table public.ai_answer_cache to service_role;

-- app_review_moderation_events (table)
grant select, insert, update, delete on table public.app_review_moderation_events to anon;
grant select, insert, update, delete on table public.app_review_moderation_events to authenticated;
grant select, insert, update, delete on table public.app_review_moderation_events to service_role;

-- app_review_reports (table)
grant select, insert, update, delete on table public.app_review_reports to anon;
grant select, insert, update, delete on table public.app_review_reports to authenticated;
grant select, insert, update, delete on table public.app_review_reports to service_role;

-- app_review_votes (table)
grant select, insert, update, delete on table public.app_review_votes to anon;
grant select, insert, update, delete on table public.app_review_votes to authenticated;
grant select, insert, update, delete on table public.app_review_votes to service_role;

-- app_reviews (table)
grant select, insert, update, delete on table public.app_reviews to anon;
grant select, insert, update, delete on table public.app_reviews to authenticated;
grant select, insert, update, delete on table public.app_reviews to service_role;

-- business_site_facts (table)
grant select on table public.business_site_facts to anon;
grant select on table public.business_site_facts to authenticated;
grant select, insert, update, delete on table public.business_site_facts to service_role;

-- business_subscriptions (table)
grant select on table public.business_subscriptions to anon;
grant select on table public.business_subscriptions to authenticated;
grant select, insert, update, delete on table public.business_subscriptions to service_role;

-- cancel_reasons (table)
grant select, insert, update, delete on table public.cancel_reasons to service_role;

-- credit_grants (table)
grant select on table public.credit_grants to authenticated;
grant select, insert, update, delete on table public.credit_grants to service_role;

-- credit_holds (table)
grant select on table public.credit_holds to authenticated;
grant select, insert, update, delete on table public.credit_holds to service_role;

-- credit_transactions (table)
grant select on table public.credit_transactions to authenticated;
grant select, insert, update, delete on table public.credit_transactions to service_role;

-- directory_apps (table)
grant select, insert, update, delete on table public.directory_apps to anon;
grant select, insert, update, delete on table public.directory_apps to authenticated;
grant select, insert, update, delete on table public.directory_apps to service_role;

-- directory_clicks (table)
grant select, insert, update, delete on table public.directory_clicks to anon;
grant select, insert, update, delete on table public.directory_clicks to authenticated;
grant select, insert, update, delete on table public.directory_clicks to service_role;

-- email_log (table)
grant select on table public.email_log to anon;
grant select on table public.email_log to authenticated;
grant select, insert, update, delete on table public.email_log to service_role;

-- newsletter_events (table)
grant select, insert, update, delete on table public.newsletter_events to anon;
grant select, insert, update, delete on table public.newsletter_events to authenticated;
grant select, insert, update, delete on table public.newsletter_events to service_role;

-- plans (table)
grant select on table public.plans to anon;
grant select on table public.plans to authenticated;
grant select, insert, update, delete on table public.plans to service_role;

-- price_changes (table)
grant select, insert, update, delete on table public.price_changes to service_role;

-- provider_errors (table)
grant select on table public.provider_errors to anon;
grant select on table public.provider_errors to authenticated;
grant select, insert, update, delete on table public.provider_errors to service_role;

-- question_library (table)
grant select, insert, update, delete on table public.question_library to service_role;

-- rate_limit_hits (table)
grant select, insert, update, delete on table public.rate_limit_hits to anon;
grant select, insert, update, delete on table public.rate_limit_hits to authenticated;
grant select, insert, update, delete on table public.rate_limit_hits to service_role;

-- report_shares (table)
grant select on table public.report_shares to anon;
grant select on table public.report_shares to authenticated;
grant select, insert, update, delete on table public.report_shares to service_role;

-- reports (table)
grant select on table public.reports to authenticated;
grant select, insert, update, delete on table public.reports to service_role;

-- scan_jobs (table)
grant select, insert, update, delete on table public.scan_jobs to service_role;

-- service_status_snapshots (table)
grant select, insert, update, delete on table public.service_status_snapshots to service_role;

-- system_alerts (table)
grant select, insert, update, delete on table public.system_alerts to service_role;

-- topup_packs (table)
grant select on table public.topup_packs to anon;
grant select on table public.topup_packs to authenticated;
grant select, insert, update, delete on table public.topup_packs to service_role;

-- video_ad_orders (table)
grant select, insert, update, delete on table public.video_ad_orders to anon;
grant select, insert, update, delete on table public.video_ad_orders to authenticated;
grant select, insert, update, delete on table public.video_ad_orders to service_role;

-- visibility_checks_30d (view)
grant select, insert, update, delete on table public.visibility_checks_30d to service_role;

-- visibility_checks_all (view)
grant select, insert, update, delete on table public.visibility_checks_all to service_role;

-- visibility_results_counted (view)
grant select, insert, update, delete on table public.visibility_results_counted to service_role;

-- visibility_results_unique (view)
grant select, insert, update, delete on table public.visibility_results_unique to service_role;

-- website_facts (table)
grant select, insert, update, delete on table public.website_facts to service_role;
