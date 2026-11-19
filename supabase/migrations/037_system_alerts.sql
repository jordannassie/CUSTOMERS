-- Migration 037: system alerts (B-69, MVP_SPEC 22, D-76). Additive only (D-43), apart from widening the
-- email_log type check to allow the admin alert email.
-- pg_cron runs check_system_alerts() every 15 minutes, then pings the app, which adds the daily AI cost check
-- (its limit is ALERT_DAILY_COST_USD, an app env var) and emails the admins at most once per hour per alert kind.

-- ---------------------------------------------------------------------------
-- system_alerts (021): one open alert per kind; a check that finds the same problem again updates it.
-- RLS stays on with no policies: admins read it through the admin DAL with the service role.
-- ---------------------------------------------------------------------------
alter table public.system_alerts
  add column if not exists last_seen_at timestamptz not null default now();

create unique index if not exists system_alerts_one_open_per_kind_idx on public.system_alerts (kind)
  where resolved_at is null;

alter table public.system_alerts enable row level security;

-- ---------------------------------------------------------------------------
-- provider_errors: one row per failed call to an outside service, for the error spike alert.
-- Written by the app with the service role; rows older than 7 days are deleted by check_system_alerts().
-- ---------------------------------------------------------------------------
create table if not exists public.provider_errors (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('openai', 'anthropic', 'perplexity', 'firecrawl', 'google_places', 'browserless')),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists provider_errors_created_at_idx on public.provider_errors (created_at desc);

alter table public.provider_errors enable row level security;

-- ---------------------------------------------------------------------------
-- email_log: allow the admin alert email.
-- ---------------------------------------------------------------------------
alter table public.email_log drop constraint if exists email_log_type_check;
alter table public.email_log add constraint email_log_type_check
  check (type in ('welcome', 'trial_ending', 'payment_failed', 'low_credits', 'weekly_report', 'system_alert'));

-- ---------------------------------------------------------------------------
-- raise_system_alert: opens an alert of this kind, or refreshes the open one. Returns the id when it opened
-- a new alert, null when one was already open.
-- ---------------------------------------------------------------------------
create or replace function public.raise_system_alert(p_kind text, p_severity text, p_message text, p_details jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.system_alerts
  set message = p_message, details = p_details, severity = p_severity, last_seen_at = now()
  where kind = p_kind and resolved_at is null;
  if found then
    return null;
  end if;

  insert into public.system_alerts (kind, severity, message, details)
  values (p_kind, p_severity, p_message, p_details)
  on conflict (kind) where resolved_at is null do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_system_alerts: the six checks in MVP_SPEC 22. The daily AI cost check runs only when a limit is
-- passed. Returns the ids of alerts it opened.
-- Event checks (failed scans, webhooks, provider errors) look at the last hour, so a resolved alert comes
-- back only when new failures happen. State checks (stuck jobs, negative balances) come back while the
-- problem is still there. The cost alert fires at most once per UTC day.
-- ---------------------------------------------------------------------------
create or replace function public.check_system_alerts(
  p_daily_cost_limit_usd numeric default null,
  p_failed_scan_share numeric default 0.2,
  p_stuck_minutes integer default 30,
  p_provider_error_count integer default 5
)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_total integer;
  v_failed integer;
  v_count integer;
  v_ids jsonb;
  v_cost numeric;
  v_providers jsonb;
  v_summary text;
begin
  delete from public.provider_errors where created_at < now() - interval '7 days';

  -- 1. More than 20% of scans failed in the last hour.
  select count(*), count(*) filter (where status = 'failed')
  into v_total, v_failed
  from public.scan_jobs
  where status in ('done', 'failed') and finished_at > now() - interval '1 hour';
  if v_failed > 0 and v_failed::numeric / v_total > p_failed_scan_share then
    v_id := public.raise_system_alert(
      'failed_scans',
      case when v_failed::numeric / v_total >= 0.5 then 'critical' else 'warning' end,
      format('%s of %s scans failed in the last hour (%s%%).', v_failed, v_total, round(100.0 * v_failed / v_total)),
      jsonb_build_object('failed', v_failed, 'finished', v_total)
    );
    if v_id is not null then return next v_id; end if;
  end if;

  -- 2. Jobs still running, or never picked up, long after reset_stuck_jobs (every 10 minutes) should have cleared them.
  select count(*), coalesce(jsonb_agg(id), '[]')
  into v_count, v_ids
  from (
    select id from public.scan_jobs
    where (status = 'running' and locked_at < now() - make_interval(mins => p_stuck_minutes))
       or (status = 'queued' and run_after < now() - make_interval(mins => p_stuck_minutes))
    order by created_at
    limit 50
  ) s;
  if v_count > 0 then
    v_id := public.raise_system_alert(
      'stuck_jobs',
      'critical',
      format('%s scan %s stuck for over %s minutes. Check that the worker is running.',
        v_count, case when v_count = 1 then 'job is' else 'jobs are' end, p_stuck_minutes),
      jsonb_build_object('count', v_count, 'job_ids', v_ids)
    );
    if v_id is not null then return next v_id; end if;
  end if;

  -- 3. Stripe webhook events that failed in the last hour (a later successful retry clears the error).
  select count(*), coalesce(jsonb_agg(stripe_event_id), '[]')
  into v_count, v_ids
  from (
    select stripe_event_id from public.stripe_webhook_events
    where error is not null and processed_at > now() - interval '1 hour'
    order by processed_at desc
    limit 50
  ) e;
  if v_count > 0 then
    v_id := public.raise_system_alert(
      'webhook_failures',
      'critical',
      format('%s Stripe webhook %s in the last hour. Customers may not get their credits or plan changes.',
        v_count, case when v_count = 1 then 'event failed' else 'events failed' end),
      jsonb_build_object('count', v_count, 'event_ids', v_ids)
    );
    if v_id is not null then return next v_id; end if;
  end if;

  -- 4. An error spike from one outside service in the last hour.
  select jsonb_object_agg(provider, n), string_agg(format('%s (%s)', label, n), ', ' order by n desc)
  into v_providers, v_summary
  from (
    select provider, count(*) as n,
      case provider
        when 'openai' then 'OpenAI'
        when 'anthropic' then 'Anthropic'
        when 'perplexity' then 'Perplexity'
        when 'firecrawl' then 'Firecrawl'
        when 'google_places' then 'Google Places'
        when 'browserless' then 'Browserless'
        else provider
      end as label
    from public.provider_errors
    where created_at > now() - interval '1 hour'
    group by provider
    having count(*) >= p_provider_error_count
  ) p;
  if v_providers is not null then
    v_id := public.raise_system_alert(
      'provider_errors',
      'warning',
      format('Errors in the last hour from %s.', v_summary),
      jsonb_build_object('errors', v_providers)
    );
    if v_id is not null then return next v_id; end if;
  end if;

  -- 5. Agencies with a negative credit balance.
  select count(*), coalesce(jsonb_agg(agency_id), '[]')
  into v_count, v_ids
  from (
    select cb.agency_id from public.agency_credit_balance cb
    join public.agencies a on a.id = cb.agency_id
    where cb.balance < 0 and a.status <> 'deleted'
    order by cb.balance
    limit 50
  ) b;
  if v_count > 0 then
    v_id := public.raise_system_alert(
      'negative_balances',
      'warning',
      format('%s %s a negative credit balance.', v_count, case when v_count = 1 then 'agency has' else 'agencies have' end),
      jsonb_build_object('count', v_count, 'agency_ids', v_ids)
    );
    if v_id is not null then return next v_id; end if;
  end if;

  -- 6. Real AI cost so far today (UTC) above the limit.
  if p_daily_cost_limit_usd is not null then
    select coalesce(sum(estimated_cost_usd), 0) into v_cost
    from public.usage_events
    where created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
    if v_cost > p_daily_cost_limit_usd and not exists (
      select 1 from public.system_alerts
      where kind = 'daily_ai_cost' and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
    ) then
      v_id := public.raise_system_alert(
        'daily_ai_cost',
        'warning',
        format('AI cost today is $%s, over the $%s daily limit.', round(v_cost, 2), round(p_daily_cost_limit_usd, 2)),
        jsonb_build_object('cost_usd', round(v_cost, 2), 'limit_usd', p_daily_cost_limit_usd)
      );
      if v_id is not null then return next v_id; end if;
    end if;
  end if;

  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- run_system_alerts: the pg_cron entry point. Runs the checks here, so alerts are stored even when the app
-- is down, then asks the app to add the cost check and send the emails. The app URL lives in Vault
-- ('system_alerts_url', set by hand per project, supabase/migrations/README.md); without it no email goes out.
-- ---------------------------------------------------------------------------
create or replace function public.run_system_alerts()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  perform public.check_system_alerts();

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'system_alerts_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'scan_worker_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return null;
  end if;

  return net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function
  public.raise_system_alert(text, text, text, jsonb),
  public.check_system_alerts(numeric, numeric, integer, integer),
  public.run_system_alerts()
from public, anon, authenticated;

grant execute on function
  public.raise_system_alert(text, text, text, jsonb),
  public.check_system_alerts(numeric, numeric, integer, integer),
  public.run_system_alerts()
to service_role;

select cron.schedule('check-system-alerts', '*/15 * * * *', 'select public.run_system_alerts()');
