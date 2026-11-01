-- Migration 038: scheduled emails (B-62, MVP_SPEC 10, D-37). Additive only (D-43): two functions and two cron
-- jobs, no new tables. Each email is sent once per unique key, checked against email_log (035) by the app.
-- pg_cron calls the app through pg_net with the worker secret; the app builds and sends the emails.

-- ---------------------------------------------------------------------------
-- low_credit_agencies: agencies whose credits are running low right now (MVP_SPEC 10, D-37).
-- level: 'low' when 80% of this period's plan and trial credits are used, 'empty' at 0, 'negative' below 0.
-- Credits held by a running scan count as not spent yet, so a scan in progress never triggers a false alarm.
-- period_end is when this period's plan or trial credits expire; the app keys each level to it (once per period).
-- ---------------------------------------------------------------------------
create or replace function public.low_credit_agencies()
returns table (agency_id uuid, level text, used integer, total integer, balance integer, period_end timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with period as (
    select g.agency_id, sum(g.amount)::integer as total, sum(g.remaining)::integer as remaining, max(g.expires_at) as period_end
    from public.credit_grants g
    where g.source in ('plan', 'trial') and g.expires_at > now()
    group by g.agency_id
  ),
  pool as (
    select
      a.id as agency_id,
      coalesce(p.total, 0) as total,
      coalesce(p.total - p.remaining, 0) as used,
      (b.balance + b.held) as balance,
      p.period_end
    from public.agencies a
    join public.agency_credit_balance b on b.agency_id = a.id
    left join period p on p.agency_id = a.id
    where a.status in ('trialing', 'active')
      and a.deleted_at is null
      -- An agency still setting up has never had credits; it is not "out" of them.
      and exists (select 1 from public.credit_grants g where g.agency_id = a.id)
  )
  select
    agency_id,
    case when balance < 0 then 'negative' when balance = 0 then 'empty' else 'low' end,
    used,
    total,
    balance,
    period_end
  from pool
  where balance <= 0 or (total > 0 and used * 5 >= total * 4);
$$;

-- ---------------------------------------------------------------------------
-- run_email_job: the pg_cron entry point. Asks the app to send one kind of scheduled email. The app URL lives
-- in Vault ('email_jobs_url', set by hand per project, supabase/migrations/README.md); without it nothing is sent.
-- ---------------------------------------------------------------------------
create or replace function public.run_email_job(p_job text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_job not in ('low_credits', 'weekly_report') then
    raise exception 'unknown email job %', p_job;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'email_jobs_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'scan_worker_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return null;
  end if;

  return net.http_post(
    url := v_url,
    body := jsonb_build_object('job', p_job),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', v_secret),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function public.low_credit_agencies(), public.run_email_job(text) from public, anon, authenticated;
grant execute on function public.low_credit_agencies(), public.run_email_job(text) to service_role;

-- Low credits: every 30 minutes. Weekly report: Mondays, every 15 minutes from 13:00 to 17:45 UTC (morning in
-- the US). Each call works for a few seconds and stops; the next call picks up agencies not emailed yet.
select cron.schedule('email-low-credits', '*/30 * * * *', $$select public.run_email_job('low_credits')$$);
select cron.schedule('email-weekly-report', '*/15 13-17 * * 1', $$select public.run_email_job('weekly_report')$$);
