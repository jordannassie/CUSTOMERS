-- Migration 058: one provider_errors row per provider and kind of failure per hour, with a count (2026-10-14).
-- Additive (D-43): two columns with defaults, one function, and check_system_alerts redefined to add up the count.
--
-- Google Places over its daily quota wrote about 30 "Places returned 429" rows in two hours, one per request. Now the
-- app calls record_provider_error(provider, kind, message): within the hour, a failure of the same provider and kind
-- (rate_limit, billing, auth, timeout, server, network, other) adds 1 to that row's occurrences and keeps the latest
-- message; after the hour a new row starts. The error spike alert (check 4) adds up occurrences instead of counting
-- rows, so it fires exactly as before. Existing rows count once each.

alter table public.provider_errors
  add column if not exists kind text,
  add column if not exists occurrences integer not null default 1;

create index if not exists provider_errors_provider_kind_idx on public.provider_errors (provider, kind, created_at desc);

create or replace function public.record_provider_error(p_provider text, p_kind text, p_message text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.provider_errors
  where provider = p_provider and kind = p_kind and created_at > now() - interval '1 hour'
  order by created_at desc
  limit 1
  for update;
  if v_id is null then
    insert into public.provider_errors (provider, kind, message) values (p_provider, p_kind, left(p_message, 1000));
  else
    update public.provider_errors set occurrences = occurrences + 1, message = left(p_message, 1000) where id = v_id;
  end if;
end;
$$;

revoke all on function public.record_provider_error(text, text, text) from public, anon, authenticated;
grant execute on function public.record_provider_error(text, text, text) to service_role;

-- check_system_alerts as in migration 037, with check 4 adding up occurrences.
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
    select provider, sum(occurrences) as n,
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
    having sum(occurrences) >= p_provider_error_count
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
