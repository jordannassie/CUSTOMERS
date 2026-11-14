-- 092: admin speed and leads (admin review, 2026-11-12).
--
-- The admin pages read whole tables and added them up in the app: every credit capture and usage row of a period,
-- every auth user to find a few emails, every scan of 50 businesses to find the last one. These functions do the
-- work in the database and return only what the page shows. Additive only (D-43): new functions, indexes, one small
-- table and three nullable columns; nothing is changed or dropped. Every function is service-role only (SEC-11).

-- Login emails for a set of users (agency owners, admins in the activity log). auth.users is not readable through
-- PostgREST; this replaces paging through every user with auth.admin.listUsers.
create or replace function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.email::text from auth.users u where u.id = any(p_ids);
$$;

-- Users whose login email contains the text, for the admin search boxes. position() instead of ilike, so % and _ in
-- the search are plain characters.
create or replace function public.admin_user_ids_by_email(p_search text, p_limit integer default 500)
returns table (id uuid)
language sql stable security definer set search_path = ''
as $$
  select u.id from auth.users u
  where length(trim(coalesce(p_search, ''))) > 0 and position(lower(trim(p_search)) in lower(u.email)) > 0
  limit greatest(1, least(coalesce(p_limit, 500), 5000));
$$;

-- The newest scan job, and the newest run from before the job queue, of each business.
create or replace function public.admin_last_scans(p_business_ids uuid[])
returns table (business_id uuid, kind text, status text, created_at timestamptz, finished_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select distinct on (x.business_id, x.kind) x.business_id, x.kind, x.status, x.created_at, x.finished_at
  from (
    select j.business_id, 'job'::text as kind, j.status, j.created_at, j.finished_at
    from public.scan_jobs j where j.business_id = any(p_business_ids)
    union all
    select r.business_id, 'run'::text, r.status, r.created_at, r.completed_at
    from public.visibility_runs r where r.business_id = any(p_business_ids) and r.scan_job_id is null
  ) x
  order by x.business_id, x.kind, x.created_at desc;
$$;

-- Credits each business's scans used since a date (all time when null), from the ledger's captures.
create or replace function public.admin_business_credits(p_business_ids uuid[], p_since timestamptz default null)
returns table (business_id uuid, credits bigint)
language sql stable security definer set search_path = ''
as $$
  select j.business_id, sum(-ct.delta)::bigint
  from public.credit_transactions ct
  join public.scan_jobs j on j.hold_id = ct.hold_id
  where ct.kind = 'capture' and j.business_id = any(p_business_ids) and (p_since is null or ct.created_at >= p_since)
  group by j.business_id;
$$;

-- Credits used, per UTC day, agency and model, split into paid credits (plan, top-up, refund, or overdraft paid off
-- later) and free ones (trial, promo, admin), so revenue counts only what customers paid for.
create or replace function public.admin_usage_credits(
  p_from timestamptz, p_to timestamptz, p_include_test boolean default false, p_agency_id uuid default null
)
returns table (day date, agency_id uuid, provider text, paid boolean, credits bigint)
language sql stable security definer set search_path = ''
as $$
  select (ct.created_at at time zone 'utc')::date, ct.agency_id, vr.provider,
         coalesce(g.source not in ('trial', 'promo', 'admin'), true), sum(-ct.delta)::bigint
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

-- Real AI cost and number of calls, per UTC day, agency, kind of work, model and cache hit. usage_events has no
-- agency column: the business's agency, else the newest agency the user owns (as the app did).
create or replace function public.admin_usage_costs(
  p_from timestamptz, p_to timestamptz, p_include_test boolean default false, p_agency_id uuid default null
)
returns table (day date, agency_id uuid, usage_type text, provider text, cached boolean, cost_usd numeric, events bigint)
language sql stable security definer set search_path = ''
as $$
  select (ue.created_at at time zone 'utc')::date, x.agency_id, ue.usage_type, ue.provider, ue.cached,
         sum(ue.estimated_cost_usd), count(*)
  from public.usage_events ue
  left join public.businesses b on b.id = ue.business_id
  left join lateral (
    select coalesce(b.agency_id, (select o.id from public.agencies o where o.owner_user_id = ue.account_user_id order by o.id desc limit 1)) as agency_id
  ) x on true
  left join public.agencies a on a.id = x.agency_id
  where ue.created_at >= p_from and ue.created_at <= p_to
    and (p_agency_id is null or x.agency_id = p_agency_id)
    and (p_include_test or (not coalesce((ue.metadata ->> 'testAccount')::boolean, false) and not coalesce(a.is_test, false)))
  group by 1, 2, 3, 4, 5;
$$;

-- Real AI cost of each scan job, from the same usage log as Usage and cost and the Overview (one source for AI cost).
create or replace function public.admin_scan_costs(p_job_ids uuid[])
returns table (scan_job_id uuid, cost_usd numeric)
language sql stable security definer set search_path = ''
as $$
  select r.scan_job_id, sum(ue.estimated_cost_usd)
  from public.visibility_runs r
  join public.usage_events ue on ue.visibility_run_id = r.id
  where r.scan_job_id = any(p_job_ids)
  group by r.scan_job_id;
$$;

revoke all on function public.admin_user_emails(uuid[]) from public, anon, authenticated;
revoke all on function public.admin_user_ids_by_email(text, integer) from public, anon, authenticated;
revoke all on function public.admin_last_scans(uuid[]) from public, anon, authenticated;
revoke all on function public.admin_business_credits(uuid[], timestamptz) from public, anon, authenticated;
revoke all on function public.admin_usage_credits(timestamptz, timestamptz, boolean, uuid) from public, anon, authenticated;
revoke all on function public.admin_usage_costs(timestamptz, timestamptz, boolean, uuid) from public, anon, authenticated;
revoke all on function public.admin_scan_costs(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_user_emails(uuid[]) to service_role;
grant execute on function public.admin_user_ids_by_email(text, integer) to service_role;
grant execute on function public.admin_last_scans(uuid[]) to service_role;
grant execute on function public.admin_business_credits(uuid[], timestamptz) to service_role;
grant execute on function public.admin_usage_credits(timestamptz, timestamptz, boolean, uuid) to service_role;
grant execute on function public.admin_usage_costs(timestamptz, timestamptz, boolean, uuid) to service_role;
grant execute on function public.admin_scan_costs(uuid[]) to service_role;

-- Indexes the admin lists sort and filter by.
create index if not exists scan_jobs_business_created_idx on public.scan_jobs (business_id, created_at desc);
create index if not exists scan_jobs_created_idx on public.scan_jobs (created_at desc);
create index if not exists scan_jobs_hold_id_idx on public.scan_jobs (hold_id) where hold_id is not null;
create index if not exists credit_transactions_capture_created_idx on public.credit_transactions (created_at) where kind = 'capture';
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists usage_events_visibility_run_idx on public.usage_events (visibility_run_id) where visibility_run_id is not null;

-- The last check of every outside service, saved by the 15-minute alerts job, so System status opens at once instead
-- of calling seven services live (item 7). One row; service role only.
create table if not exists public.service_status_snapshots (
  id text primary key default 'latest' check (id = 'latest'),
  checked_at timestamptz not null,
  services jsonb not null
);
alter table public.service_status_snapshots enable row level security;
revoke all on table public.service_status_snapshots from anon, authenticated;

-- Leads: an internal note, which admin handles it and when someone replied (item 8). contact_submissions.notes stays
-- with the video ads de-duplication key it already holds.
alter table public.contact_submissions add column if not exists admin_notes text check (char_length(admin_notes) <= 4000);
alter table public.contact_submissions add column if not exists handled_by text check (char_length(handled_by) <= 320);
alter table public.contact_submissions add column if not exists replied_at timestamptz;
