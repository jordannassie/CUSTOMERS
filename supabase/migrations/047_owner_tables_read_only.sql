-- Migration 047 (SEC-10): signed-in users read their own businesses, questions, competitors, opportunities and scan
-- results through RLS, but never write them directly. Every write goes through the app's server code, which checks
-- ownership and plan limits first and uses the service role. The old "owner can do anything" policies are replaced
-- by select-only ones, and table write grants are taken from anon and authenticated as a second guard.
-- No data changes. profiles (active business, name) and feature_requests stay writable by their owner.

-- businesses: owners still read their own rows (businesses_agency_select also covers the agency's rows).
drop policy if exists businesses_owner_all on public.businesses;
create policy businesses_owner_select on public.businesses
  for select to authenticated using ((select auth.uid()) = owner_user_id);

drop policy if exists tracked_prompts_owner_all on public.tracked_prompts;
create policy tracked_prompts_owner_select on public.tracked_prompts
  for select to authenticated using (
    exists (select 1 from public.businesses b where b.id = tracked_prompts.business_id and b.owner_user_id = (select auth.uid()))
  );

drop policy if exists business_competitors_owner_all on public.business_competitors;
create policy business_competitors_owner_select on public.business_competitors
  for select to authenticated using (
    exists (select 1 from public.businesses b where b.id = business_competitors.business_id and b.owner_user_id = (select auth.uid()))
  );

drop policy if exists opportunities_owner_all on public.opportunities;
create policy opportunities_owner_select on public.opportunities
  for select to authenticated using (
    exists (select 1 from public.businesses b where b.id = opportunities.business_id and b.owner_user_id = (select auth.uid()))
  );

-- Scan results are written only by the scan worker (service role).
drop policy if exists visibility_runs_owner_insert on public.visibility_runs;
drop policy if exists visibility_runs_owner_update on public.visibility_runs;
drop policy if exists visibility_results_owner_insert on public.visibility_results;
drop policy if exists visibility_scores_owner_insert on public.visibility_scores;

-- Tables of the old engine: read only for owners too.
drop policy if exists agent_readiness_actions_owner_all on public.agent_readiness_actions;
create policy agent_readiness_actions_owner_select on public.agent_readiness_actions
  for select to authenticated using (
    exists (select 1 from public.businesses b where b.id = agent_readiness_actions.business_id and b.owner_user_id = (select auth.uid()))
  );
drop policy if exists agent_readiness_scans_owner_all on public.agent_readiness_scans;
create policy agent_readiness_scans_owner_select on public.agent_readiness_scans
  for select to authenticated using (
    exists (select 1 from public.businesses b where b.id = agent_readiness_scans.business_id and b.owner_user_id = (select auth.uid()))
  );
drop policy if exists service_requests_owner_insert on public.service_requests;
drop policy if exists owner_insert_seo_snapshots on public.seo_snapshots;
drop policy if exists owner_update_seo_snapshots on public.seo_snapshots;

revoke insert, update, delete on table
  public.businesses,
  public.tracked_prompts,
  public.business_competitors,
  public.opportunities,
  public.visibility_runs,
  public.visibility_results,
  public.visibility_scores,
  public.agent_readiness_actions,
  public.agent_readiness_scans,
  public.service_requests,
  public.seo_snapshots,
  public.business_site_facts,
  public.business_subscriptions,
  public.agencies,
  public.plans,
  public.topup_packs,
  public.report_shares,
  public.subscriptions,
  public.billing_accounts,
  public.business_billing_items,
  public.usage_events,
  public.email_log,
  public.provider_errors,
  public.stripe_webhook_events,
  public.account_purges
from anon, authenticated;
