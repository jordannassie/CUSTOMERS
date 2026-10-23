-- Migration 070: refunded top-ups and no empty balance at renewal (2026-10-16, MVP_SPEC 4.2, 11.3, 11.5, D-54,
-- D-55, D-57). Additive only (D-43): one wider check constraint, two new credit functions and one replaced function
-- (same name, arguments and result).
--
-- 1. refund_topup_grant: Stripe's charge.refunded for a top-up takes the refunded share of that top-up's credits out
--    of its grant, with a 'refund' ledger row. Only what is left can go: credits already spent stay spent, and a
--    refund never makes the balance go below what the grants hold (no overdraft, D-54 caps that at one running
--    scan). Whatever could not be removed is raised as an admin alert. Every refund leaves an admin_audit_log row
--    (action stripe.topup_refund, no admin), which is also its replay guard.
-- 2. end_previous_period_grants: plan and trial grants now expire 6 hours after their period ends (the app sets the
--    expiry), so the minutes or hours before Stripe's renewal invoice is paid are never at 0 credits. When the new
--    period's invoice is paid, this ends the previous period's grants at once, so its leftover credits are not added
--    to the new month.
-- 3. low_credit_agencies: the renewal date in the low credits email comes from the agency's billing period, not
--    from the latest grant expiry, which is now 6 hours later.

-- ---------------------------------------------------------------------------
-- credit_transactions.kind: allow 'refund'
-- ---------------------------------------------------------------------------
alter table public.credit_transactions drop constraint if exists credit_transactions_kind_check;
alter table public.credit_transactions add constraint credit_transactions_kind_check
  check (kind in ('grant', 'capture', 'release', 'expire', 'admin_adjust', 'overdraft_settle', 'refund'));

-- ---------------------------------------------------------------------------
-- refund_topup_grant: removes the refunded share of a top-up grant. Returns
-- { status: 'refunded' | 'duplicate' | 'no_grant', credits, removed, unrecovered }.
-- p_refunded_cents is the charge's total refunded so far (Stripe's amount_refunded), so refunds that arrive out of
-- order or twice never remove more than the refunded share: credits = round(grant amount x refunded / charge),
-- minus what earlier refunds of this grant already covered.
-- ---------------------------------------------------------------------------
create or replace function public.refund_topup_grant(
  p_agency_id uuid,
  p_source_id text,
  p_refund_id text,
  p_refunded_cents integer,
  p_charge_cents integer,
  p_charge_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant_id uuid;
  v_amount integer;
  v_remaining integer;
  v_target integer;
  v_covered integer;
  v_credits integer;
  v_removed integer;
  v_unrecovered integer;
  v_status text := 'refunded';
  v_details jsonb;
begin
  if p_refund_id is null or p_refund_id = '' or p_source_id is null or p_source_id = '' then
    raise exception 'source_id_required' using errcode = '22023';
  end if;
  if p_charge_cents is null or p_charge_cents <= 0 or p_refunded_cents is null
     or p_refunded_cents < 0 or p_refunded_cents > p_charge_cents then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  perform public.credit_lock_agency(p_agency_id);

  -- A refund ID is unique in Stripe: seen in the ledger or this agency's audit rows, it was handled.
  if exists (select 1 from public.credit_transactions where source_type = 'refund' and source_id = p_refund_id)
     or exists (
       select 1 from public.admin_audit_log
       where target_type = 'agency' and target_id = p_agency_id::text
         and action = 'stripe.topup_refund' and details->>'refund_id' = p_refund_id
     ) then
    return jsonb_build_object('status', 'duplicate', 'credits', 0, 'removed', 0, 'unrecovered', 0);
  end if;

  select id, amount, remaining into v_grant_id, v_amount, v_remaining from public.credit_grants
  where agency_id = p_agency_id and source = 'topup' and source_id = p_source_id
  for update;

  if v_grant_id is null then
    v_status := 'no_grant';
    v_credits := 0;
    v_removed := 0;
    v_unrecovered := 0;
  else
    v_target := least(v_amount, round(v_amount::numeric * p_refunded_cents / p_charge_cents)::integer);
    select coalesce(sum((details->>'credits')::integer), 0) into v_covered from public.admin_audit_log
    where target_type = 'agency' and target_id = p_agency_id::text
      and action = 'stripe.topup_refund' and details->>'grant_id' = v_grant_id::text;
    v_credits := greatest(v_target - v_covered, 0);
    v_removed := least(v_credits, v_remaining);
    v_unrecovered := v_credits - v_removed;
  end if;

  if v_removed > 0 then
    update public.credit_grants set remaining = remaining - v_removed where id = v_grant_id;
    insert into public.credit_transactions (agency_id, grant_id, delta, kind, source_type, source_id, note)
    values (
      p_agency_id, v_grant_id, -v_removed, 'refund', 'refund', p_refund_id,
      format('Top-up refunded in Stripe (%s)', p_refund_id)
    );
  end if;

  v_details := jsonb_build_object(
    'refund_id', p_refund_id,
    'charge_id', p_charge_id,
    'source_id', p_source_id,
    'grant_id', v_grant_id,
    'refunded_cents', p_refunded_cents,
    'charge_cents', p_charge_cents,
    'credits', v_credits,
    'removed', v_removed,
    'unrecovered', v_unrecovered,
    'reason', case
      when v_status = 'no_grant' then format('Refund %s: no top-up credits were found for checkout %s.', p_refund_id, p_source_id)
      when v_unrecovered > 0 then format('Refund %s: %s credits removed, %s were already spent.', p_refund_id, v_removed, v_unrecovered)
      else format('Refund %s: %s credits removed.', p_refund_id, v_removed)
    end
  );

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  values (null, 'stripe.topup_refund', 'agency', p_agency_id::text, v_details);

  if v_status = 'no_grant' or v_unrecovered > 0 then
    perform public.raise_system_alert(
      'topup_refund_unrecovered',
      'warning',
      format('A refunded top-up could not be fully taken back for agency %s: %s', p_agency_id, v_details->>'reason'),
      v_details || jsonb_build_object('agency_id', p_agency_id)
    );
  end if;

  return jsonb_build_object('status', v_status, 'credits', v_credits, 'removed', v_removed, 'unrecovered', v_unrecovered);
end;
$$;

-- ---------------------------------------------------------------------------
-- end_previous_period_grants: when a new period's invoice is paid, the plan and trial grants that expire by
-- p_period_start + p_grace_seconds (the previous period, still in its grace hours) end now, with an 'expire' ledger
-- row like expire_grants. The new period's grants expire later, so they are never touched. A period that has not
-- started yet ends nothing. Returns the credits removed.
-- ---------------------------------------------------------------------------
create or replace function public.end_previous_period_grants(
  p_agency_id uuid,
  p_period_start timestamptz,
  p_grace_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant record;
  v_removed integer := 0;
begin
  if p_period_start is null or p_grace_seconds is null or p_grace_seconds < 0 or p_grace_seconds > 86400 then
    raise exception 'invalid_period' using errcode = '22023';
  end if;
  -- Stripe's clock and ours can differ a little; a period further ahead has not started.
  if p_period_start > now() + interval '5 minutes' then
    return 0;
  end if;

  perform public.credit_lock_agency(p_agency_id);

  for v_grant in
    select id, remaining from public.credit_grants
    where agency_id = p_agency_id
      and source in ('plan', 'trial')
      and remaining > 0
      and expires_at is not null
      and expires_at <= p_period_start + make_interval(secs => p_grace_seconds)
    for update
  loop
    update public.credit_grants set remaining = 0, expires_at = least(expires_at, now()) where id = v_grant.id;
    insert into public.credit_transactions (agency_id, grant_id, delta, kind, source_type, source_id)
    values (p_agency_id, v_grant.id, -v_grant.remaining, 'expire', 'expire', v_grant.id::text);
    v_removed := v_removed + v_grant.remaining;
  end loop;

  return v_removed;
end;
$$;

-- ---------------------------------------------------------------------------
-- low_credit_agencies: as in 053, with period_end from agencies.current_period_end (the real renewal) while it is
-- ahead, else the latest grant expiry as before.
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
      case when a.current_period_end > now() then a.current_period_end else p.period_end end as period_end
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
  where balance <= 0 or (total > 0 and used * 5 >= total * 4 and balance * 5 <= total);
$$;

revoke all on function public.refund_topup_grant(uuid, text, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.end_previous_period_grants(uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.low_credit_agencies() from public, anon, authenticated;
grant execute on function public.refund_topup_grant(uuid, text, text, integer, integer, text) to service_role;
grant execute on function public.end_previous_period_grants(uuid, timestamptz, integer) to service_role;
grant execute on function public.low_credit_agencies() to service_role;
