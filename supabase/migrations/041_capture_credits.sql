-- Migration 041: capture_credits, capture_credit for several checks of one hold at once (E2E-0929 BUG-3).
-- Additive only (D-43); capture_credit stays as it is.
--
-- Every capture locks the agency row (D-55), so a scan capturing each check on its own queued up to 5 calls per
-- scan (10 scans at once per worker) on one row. Under load the queue passed the 8s statement timeout. The scan
-- now captures the checks finished since its last call in one transaction: one lock per batch, same rules per
-- check as capture_credit (idempotent per check ID, open hold only, soonest-expiring grant first, overdraft).

create or replace function public.capture_credits(p_hold_id uuid, p_check_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold public.credit_holds%rowtype;
  v_agency_id uuid;
  v_check_id uuid;
  v_grant_id uuid;
  v_charged integer := 0;
begin
  select agency_id into v_agency_id from public.credit_holds where id = p_hold_id;
  if not found then
    raise exception 'hold_not_found' using errcode = 'P0002';
  end if;

  -- Agency first, then hold: the same lock order as every other credit function.
  perform public.credit_lock_agency(v_agency_id);
  select * into v_hold from public.credit_holds where id = p_hold_id for update;

  foreach v_check_id in array coalesce(
    (select array_agg(distinct c) from unnest(p_check_ids) as c where c is not null), '{}'::uuid[]
  ) loop
    continue when exists (
      select 1 from public.credit_transactions where source_type = 'check' and source_id = v_check_id::text
    );

    if v_hold.status <> 'open' then
      raise exception 'hold_closed' using errcode = 'P0001';
    end if;
    if v_hold.captured + v_hold.released + v_charged >= v_hold.amount then
      raise exception 'hold_used_up' using errcode = 'P0001';
    end if;

    v_grant_id := null;
    select id into v_grant_id
    from public.credit_grants
    where agency_id = v_agency_id and remaining > 0 and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, created_at, id
    limit 1
    for update;

    if v_grant_id is null then
      -- D-54: a started scan always finishes; the charge becomes overdraft paid off by the next grant.
      update public.agencies set credit_overdraft = credit_overdraft + 1 where id = v_agency_id;
    else
      update public.credit_grants set remaining = remaining - 1 where id = v_grant_id;
    end if;

    insert into public.credit_transactions (agency_id, grant_id, hold_id, delta, kind, source_type, source_id)
    values (v_agency_id, v_grant_id, p_hold_id, -1, 'capture', 'check', v_check_id::text);
    v_charged := v_charged + 1;
  end loop;

  if v_charged > 0 then
    update public.credit_holds set captured = captured + v_charged where id = p_hold_id;
    update public.scan_jobs set credits_charged = credits_charged + v_charged where id = v_hold.scan_job_id;
  end if;

  return v_charged;
end;
$$;

-- Same grants as capture_credit: the service role (the scan worker) only.
revoke all on function public.capture_credits(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.capture_credits(uuid, uuid[]) to service_role;
