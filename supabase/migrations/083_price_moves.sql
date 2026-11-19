-- 083: existing customers move to a new plan price at their next renewal, with an email first (D-93). Additive only.
--
-- business_subscriptions.price_cents: what Stripe charges for the business's item each month, written by the webhook
--   and by the price move job. Null until either has seen the item.
-- price_changes: one row per business moved to a new price, grouped by `batch` (one agency, one run). The job emails
--   each batch once (email_log key price_change:<batch>). Server only.
-- email_log.type gains 'price_change'; run_email_job gains the 'price_changes' job, run hourly.

alter table public.business_subscriptions add column if not exists price_cents integer;

create table if not exists public.price_changes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan_id text not null references public.plans (id),
  from_cents integer not null check (from_cents >= 0),
  to_cents integer not null check (to_cents >= 0),
  -- The renewal the new price applies from.
  starts_at timestamptz not null,
  batch uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists price_changes_batch_idx on public.price_changes (batch);
create index if not exists price_changes_created_idx on public.price_changes (created_at desc);
alter table public.price_changes enable row level security;
revoke all on public.price_changes from anon, authenticated;

alter table public.email_log drop constraint if exists email_log_type_check;
alter table public.email_log add constraint email_log_type_check check (type in (
  'welcome', 'trial_ending', 'payment_failed', 'low_credits', 'weekly_report', 'system_alert', 'business_deleted',
  'account_deleted', 'account_restored', 'account_purged', 'price_change'
));

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
  if p_job not in ('low_credits', 'weekly_report', 'price_changes') then
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

revoke all on function public.run_email_job(text) from public, anon, authenticated;
grant execute on function public.run_email_job(text) to service_role;

select cron.schedule('email-price-changes', '20 * * * *', $$select public.run_email_job('price_changes')$$);
