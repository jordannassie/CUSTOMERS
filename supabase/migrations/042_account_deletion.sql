-- Migration 042: account and business deletion (B-77, MVP_SPEC 23, D-77). Additive only (D-43): new columns, a
-- restrictive policy, a small notices table, functions and one cron job, plus widening the email_log type check.
-- Deleting is a soft delete at once; pg_cron removes the data for good once purge_after has passed. The app sets
-- purge_after from its one waiting period setting (DELETION_WAIT_DAYS), so the length lives in one place.

alter table public.agencies
  add column if not exists purge_after timestamptz;

alter table public.businesses
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz;

create index if not exists agencies_purge_after_idx on public.agencies (purge_after) where purge_after is not null;
create index if not exists businesses_purge_after_idx on public.businesses (purge_after) where purge_after is not null;

-- A deleted business disappears for signed-in users (and with it, through their policies, its questions and
-- results). Restrictive, so it narrows the existing policies instead of replacing them.
create policy "businesses_hide_deleted" on public.businesses
  as restrictive
  for all to authenticated
  using (deleted_at is null)
  with check (deleted_at is null);

-- ---------------------------------------------------------------------------
-- email_log: allow the deletion emails.
-- ---------------------------------------------------------------------------
alter table public.email_log drop constraint if exists email_log_type_check;
alter table public.email_log add constraint email_log_type_check
  check (type in (
    'welcome', 'trial_ending', 'payment_failed', 'low_credits', 'weekly_report', 'system_alert',
    'business_deleted', 'account_deleted', 'account_restored', 'account_purged'
  ));

-- ---------------------------------------------------------------------------
-- account_purges: who to send the "your data is gone" email to, and whose logo files to remove. SQL cannot
-- delete Storage files safely, so the app does both, then deletes the row. Rows older than 7 days are dropped
-- by purge_deleted_accounts() either way, so no email address is kept for long.
-- RLS stays on with no policies: only the service role reaches it.
-- ---------------------------------------------------------------------------
create table if not exists public.account_purges (
  agency_id uuid primary key,
  owner_email text,
  agency_name text not null,
  purged_at timestamptz not null default now()
);

alter table public.account_purges enable row level security;

-- ---------------------------------------------------------------------------
-- stop_scans: removes queued scan jobs of an agency (or one of its businesses) and returns their credit holds.
-- Running jobs finish, since a started scan always finishes (MVP_SPEC 4).
-- ---------------------------------------------------------------------------
create or replace function public.stop_scans(p_agency_id uuid, p_business_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job record;
  v_count integer := 0;
begin
  for v_job in
    select j.id, j.hold_id from public.scan_jobs j
    where j.agency_id = p_agency_id
      and j.status = 'queued'
      and (p_business_id is null or j.business_id = p_business_id)
    for update
  loop
    if v_job.hold_id is not null then
      perform public.release_hold(v_job.hold_id);
    end if;
    delete from public.scan_jobs where id = v_job.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- soft_delete_agency: status 'deleted', share links revoked, queued scans stopped. Login is blocked by the app
-- (requireAgency). Returns false when the agency is missing or already deleted.
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_agency(p_agency_id uuid, p_purge_after timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.agencies
  set status = 'deleted', deleted_at = now(), purge_after = p_purge_after
  where id = p_agency_id and status <> 'deleted';
  if not found then
    return false;
  end if;

  update public.report_shares s
  set revoked_at = now()
  from public.businesses b
  where s.business_id = b.id and b.agency_id = p_agency_id and s.revoked_at is null;

  perform public.stop_scans(p_agency_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- soft_delete_business: hides one business, stops its scans and revokes its share links. Returns false when the
-- business is not in that agency or is already deleted.
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_business(p_agency_id uuid, p_business_id uuid, p_purge_after timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses
  set deleted_at = now(), purge_after = p_purge_after, next_scan_at = null, updated_at = now()
  where id = p_business_id and agency_id = p_agency_id and deleted_at is null;
  if not found then
    return false;
  end if;

  update public.report_shares set revoked_at = now() where business_id = p_business_id and revoked_at is null;
  update public.profiles set active_business_id = null where active_business_id = p_business_id;
  perform public.stop_scans(p_agency_id, p_business_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- purge_deleted_accounts: permanently removes what is past its purge_after.
-- Accounts: the ledger (credit_transactions) and the email log are anonymised, never deleted; then the agency
-- row (with its businesses, questions, results, scans, grants and holds, by cascade) and the auth user go.
-- Invoices stay in Stripe. Businesses: removed once their plan item has ended, so a Stripe event at period end
-- still finds its row. Returns how many accounts and businesses were removed.
-- ---------------------------------------------------------------------------
create or replace function public.purge_deleted_accounts()
returns table (accounts integer, businesses integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency record;
  v_accounts integer := 0;
  v_businesses integer := 0;
begin
  for v_agency in
    select a.id, a.name, a.owner_user_id, u.email
    from public.agencies a
    left join auth.users u on u.id = a.owner_user_id
    where a.status = 'deleted' and a.purge_after is not null and a.purge_after <= now()
    for update of a
  loop
    update public.credit_transactions set agency_id = null where agency_id = v_agency.id;
    update public.email_log set agency_id = null, to_email = 'deleted' where agency_id = v_agency.id;

    insert into public.account_purges (agency_id, owner_email, agency_name)
    values (v_agency.id, v_agency.email, v_agency.name)
    on conflict (agency_id) do nothing;

    delete from public.agencies where id = v_agency.id;
    -- service_requests.requested_by has no cascade, so it must go before the user.
    delete from public.service_requests where requested_by = v_agency.owner_user_id;
    delete from auth.users where id = v_agency.owner_user_id;
    v_accounts := v_accounts + 1;
  end loop;

  delete from public.businesses b
  where b.deleted_at is not null and b.purge_after is not null and b.purge_after <= now()
    and not exists (
      select 1 from public.business_subscriptions s where s.business_id = b.id and s.status <> 'canceled'
    );
  get diagnostics v_businesses = row_count;

  delete from public.account_purges where purged_at < now() - interval '7 days';

  return query select v_accounts, v_businesses;
end;
$$;

-- ---------------------------------------------------------------------------
-- run_account_purge: the pg_cron entry point. Purges here, so it happens even when the app is down, then asks the
-- app (the email jobs URL from 038, in Vault) to remove logo files and send the last email for each purged account.
-- ---------------------------------------------------------------------------
create or replace function public.run_account_purge()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  perform public.purge_deleted_accounts();
  if not exists (select 1 from public.account_purges) then
    return null;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'email_jobs_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'scan_worker_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return null;
  end if;

  return net.http_post(
    url := v_url,
    body := jsonb_build_object('job', 'account_purged'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', v_secret),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function
  public.stop_scans(uuid, uuid),
  public.soft_delete_agency(uuid, timestamptz),
  public.soft_delete_business(uuid, uuid, timestamptz),
  public.purge_deleted_accounts(),
  public.run_account_purge()
from public, anon, authenticated;

grant execute on function
  public.stop_scans(uuid, uuid),
  public.soft_delete_agency(uuid, timestamptz),
  public.soft_delete_business(uuid, uuid, timestamptz),
  public.purge_deleted_accounts(),
  public.run_account_purge()
to service_role;

select cron.schedule('purge-deleted-accounts', '45 3 * * *', 'select public.run_account_purge()');
