-- Migration 098: a new scan starts only when the credits cover the whole scan (owner, 2026-11-16; D-54 changed).
-- Additive (D-43): replaces one function, no table changes.
--
-- Before, hold_credits let a new scan start at any balance above 0 and finish past zero, so an agency with 5 credits
-- could run a 30-check scan and owe 25 (taken from its next grant, or never, if it stopped paying). Now a new hold
-- needs the balance to cover the full amount held (one credit per question per AI; answers reused from the cache are
-- given back when the scan ends). A retried scan keeps its existing hold as before: a scan that started always
-- finishes. Same agency lock as every credit function (D-55), so two scans cannot both pass the check.

create or replace function public.hold_credits(p_agency_id uuid, p_amount integer, p_scan_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_overdraft integer;
  v_hold_id uuid;
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_overdraft := public.credit_lock_agency(p_agency_id);

  if not exists (select 1 from public.scan_jobs where id = p_scan_job_id and agency_id = p_agency_id) then
    raise exception 'scan_job_not_found' using errcode = 'P0002';
  end if;

  -- A retried job gets its existing hold back instead of a second one. It started, so it finishes (D-54): when
  -- questions or models were added since, the hold grows to cover every check instead of failing on hold_used_up.
  select id into v_hold_id from public.credit_holds where scan_job_id = p_scan_job_id;
  if found then
    update public.credit_holds set amount = p_amount where id = v_hold_id and status = 'open' and amount < p_amount;
    return v_hold_id;
  end if;

  select
    coalesce((select sum(remaining) from public.credit_grants
              where agency_id = p_agency_id and remaining > 0 and (expires_at is null or expires_at > now())), 0)
    - coalesce((select sum(amount - captured - released) from public.credit_holds
                where agency_id = p_agency_id and status = 'open'), 0)
    - v_overdraft
  into v_balance;

  -- The whole scan must be covered, not just one credit of it (was: v_balance <= 0).
  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001', detail = format('balance %s, needed %s', v_balance, p_amount);
  end if;

  insert into public.credit_holds (agency_id, scan_job_id, amount)
  values (p_agency_id, p_scan_job_id, p_amount)
  returning id into v_hold_id;

  update public.scan_jobs set hold_id = v_hold_id where id = p_scan_job_id;

  return v_hold_id;
end;
$$;

revoke all on function public.hold_credits(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.hold_credits(uuid, integer, uuid) to service_role;
