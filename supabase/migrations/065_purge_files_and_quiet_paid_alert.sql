-- Migration 065: two cleanups that stopped too early or never ran (2026-10-16). Additive only (D-43): two functions
-- redefined, no table changes, RLS unchanged.
--
-- 1. purge_deleted_accounts (as in 060): account_purges rows older than 7 days were deleted, so when the app's
--    follow-up (logo files, last email) kept failing for a week the agency's logo files were never removed. Now the
--    email address and agency name are cleared after 7 days, as before, but the row stays until the follow-up has
--    removed the files.
-- 2. resolve_quiet_system_alerts (as in 063): also closes paid_not_active. The app's 15 minute check raises it
--    while an agency is stuck on its trial after paying, so once it is not seen for an hour the problem is gone.

-- ---------------------------------------------------------------------------
-- purge_deleted_accounts: as in 060, but account_purges rows are emptied after 7 days instead of deleted.
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
    select a.id, a.name, a.owner_user_id, a.is_test, u.email
    from public.agencies a
    left join auth.users u on u.id = a.owner_user_id
    where a.status = 'deleted' and a.purge_after is not null and a.purge_after <= now()
    for update of a
  loop
    update public.credit_transactions set agency_id = null, from_test_agency = v_agency.is_test where agency_id = v_agency.id;
    update public.email_log set agency_id = null, to_email = 'deleted' where agency_id = v_agency.id;

    update public.usage_events e
    set account_user_id = null,
        business_id = null,
        visibility_run_id = null,
        metadata = jsonb_strip_nulls(jsonb_build_object(
          'task', e.metadata -> 'task',
          'fellBack', e.metadata -> 'fellBack',
          'accountDeleted', true,
          'testAccount', v_agency.is_test
        ))
    where e.account_user_id = v_agency.owner_user_id
       or e.business_id in (select b.id from public.businesses b where b.agency_id = v_agency.id);

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

  -- After 7 days the address and name are dropped, but the row stays until the app has removed the logo files:
  -- the follow-up then skips the email, removes the files and deletes the row.
  update public.account_purges
  set owner_email = null, agency_name = ''
  where purged_at < now() - interval '7 days' and (owner_email is not null or agency_name <> '');

  return query select v_accounts, v_businesses;
end;
$$;

revoke all on function public.purge_deleted_accounts() from public, anon, authenticated;
grant execute on function public.purge_deleted_accounts() to service_role;

-- ---------------------------------------------------------------------------
-- resolve_quiet_system_alerts: as in 063, plus paid_not_active.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_quiet_system_alerts(p_quiet interval default interval '1 hour')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.system_alerts
  set resolved_at = now()
  where resolved_at is null
    and kind in ('stuck_jobs', 'failed_scans', 'ai_fallback', 'provider_errors', 'negative_balances', 'paid_not_active')
    and last_seen_at < now() - p_quiet;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.resolve_quiet_system_alerts(interval) from public, anon, authenticated;
grant execute on function public.resolve_quiet_system_alerts(interval) to service_role;
