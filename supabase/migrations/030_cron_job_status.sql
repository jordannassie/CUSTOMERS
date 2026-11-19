-- Migration 030: last run of each pg_cron job for the admin status page (B-28 for B-68).
-- The cron schema is not exposed to the API, so this reads it with the owner's rights. Service role only.

create or replace function public.cron_job_status()
returns table (
  job_name text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_status text,
  last_message text
)
language sql
stable
security definer
set search_path = ''
as $$
  select j.jobname, j.schedule, j.active, r.start_time, r.status, left(r.return_message, 500)
  from cron.job j
  left join lateral (
    select d.start_time, d.status, d.return_message
    from cron.job_run_details d
    where d.jobid = j.jobid
    order by d.start_time desc
    limit 1
  ) r on true
  order by j.jobname;
$$;

revoke all on function public.cron_job_status() from public, anon, authenticated;
grant execute on function public.cron_job_status() to service_role;
