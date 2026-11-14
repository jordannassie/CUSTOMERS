-- Admin audit fixes (2026-11-12). Replaces two read-only admin functions from 092; no table changes.

-- 1. Usage and cost: a capture whose agency is gone (account deleted) no longer counts as paid. Such rows lose both
-- their grant and their agency, and the old "no grant means paid" rule (meant for overdraft paid off later) turned
-- deleted accounts' trial credits into revenue. An overdraft capture keeps its agency, so it still counts as paid.
create or replace function public.admin_usage_credits(
  p_from timestamptz, p_to timestamptz, p_include_test boolean default false, p_agency_id uuid default null
)
returns table (day date, agency_id uuid, provider text, paid boolean, credits bigint)
language sql stable security definer set search_path = ''
as $$
  select (ct.created_at at time zone 'utc')::date, ct.agency_id, vr.provider,
         case
           when g.source is not null then g.source not in ('trial', 'promo', 'admin')
           when ct.agency_id is null then false
           else true
         end,
         sum(-ct.delta)::bigint
  from public.credit_transactions ct
  left join public.credit_grants g on g.id = ct.grant_id
  left join public.agencies a on a.id = ct.agency_id
  -- A capture's source_id is its check's visibility_results id; anything not shaped like an id simply matches nothing.
  left join public.visibility_results vr
    on vr.id = case when ct.source_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ct.source_id::uuid end
  where ct.kind = 'capture' and ct.created_at >= p_from and ct.created_at <= p_to
    and (p_agency_id is null or ct.agency_id = p_agency_id)
    and (p_include_test or (not coalesce(ct.from_test_agency, false) and not coalesce(a.is_test, false)))
  group by 1, 2, 3, 4;
$$;

-- 2. Scans: each scan's real AI cost. Checks now carry their run id; scans from before that have none, so their cost
-- is the business's unlinked AI usage during the run (start to finish, plus two minutes for the last writes).
-- Null when nothing was logged at all, so the page can say "Not recorded" instead of a false $0.00.
create or replace function public.admin_scan_costs(p_job_ids uuid[])
returns table (scan_job_id uuid, cost_usd numeric)
language sql stable security definer set search_path = ''
as $$
  select r.scan_job_id,
         coalesce(
           (select sum(ue.estimated_cost_usd) from public.usage_events ue where ue.visibility_run_id = r.id),
           (select sum(ue.estimated_cost_usd)
              from public.usage_events ue
             where ue.visibility_run_id is null
               and ue.business_id = j.business_id
               and ue.created_at >= r.started_at
               and ue.created_at <= coalesce(r.completed_at, r.started_at) + interval '2 minutes')
         )
  from public.visibility_runs r
  join public.scan_jobs j on j.id = r.scan_job_id
  where r.scan_job_id = any(p_job_ids);
$$;

revoke all on function public.admin_usage_credits(timestamptz, timestamptz, boolean, uuid) from public, anon, authenticated;
revoke all on function public.admin_scan_costs(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_usage_credits(timestamptz, timestamptz, boolean, uuid) to service_role;
grant execute on function public.admin_scan_costs(uuid[]) to service_role;

-- For the fallback above: one business's usage in a time window.
create index if not exists usage_events_business_created_idx on public.usage_events (business_id, created_at);
