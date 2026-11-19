-- 059: BUG-160. What the AI providers charged us (usage_events) is kept, anonymised, when an account is purged.
-- Before, the rows went with the auth user (ON DELETE CASCADE), so admin cost totals dropped and "Deleted accounts"
-- showed its credits at $0.00, a false 100% margin. The credit ledger was already kept the same way (042).
--
-- Not purely additive (D-43): the foreign key changes from CASCADE to SET NULL and account_user_id may be null.
-- Approved by the user on 2026-10-14. Nothing reads a null account_user_id except the admin cost report.

-- 1. A deleted user no longer takes the cost rows with it.
alter table public.usage_events alter column account_user_id drop not null;
alter table public.usage_events drop constraint if exists usage_events_account_user_id_fkey;
alter table public.usage_events
  add constraint usage_events_account_user_id_fkey
  foreign key (account_user_id) references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. purge_deleted_accounts: as in 042, plus each purged account's cost rows are anonymised first. Kept: provider,
-- model, usage type, cost, tokens, cache flag, date and the background job's name (task, fellBack). Removed: the
-- user, the business, the scan run and any error text. testAccount keeps a test agency's costs out of the real
-- totals, as before the purge.
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
    update public.credit_transactions set agency_id = null where agency_id = v_agency.id;
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

  delete from public.account_purges where purged_at < now() - interval '7 days';

  return query select v_accounts, v_businesses;
end;
$$;

revoke all on function public.purge_deleted_accounts() from public, anon, authenticated;
grant execute on function public.purge_deleted_accounts() to service_role;
