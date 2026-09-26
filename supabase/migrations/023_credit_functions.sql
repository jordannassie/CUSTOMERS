-- Migration 023: credit SQL functions (B-13, MVP_SPEC 4.2, D-53, D-54, D-55).
-- Additive only (D-43). The only way credits change; callable by the service role only.
--
-- Ledger rule: the sum of an agency's credit_transactions.delta equals the remaining credits on its
-- grants minus its overdraft. Holds are not ledger rows: they only reserve credits until a capture.

-- ---------------------------------------------------------------------------
-- agencies.credit_overdraft: credits charged with no grant left to take them from (D-54)
-- ---------------------------------------------------------------------------
alter table public.agencies
  add column if not exists credit_overdraft integer not null default 0 check (credit_overdraft >= 0);

comment on column public.agencies.credit_overdraft is
  'Credits charged after every grant ran out (D-54). Paid off first by the next grant; changed only by the credit functions.';

-- Same columns as B-12 plus overdraft, which the balance now subtracts.
create or replace view public.agency_credit_balance
with (security_invoker = true) as
select
  a.id as agency_id,
  coalesce(g.plan_remaining, 0)::integer as plan_remaining,
  coalesce(g.topup_remaining, 0)::integer as topup_remaining,
  coalesce(h.held, 0)::integer as held,
  (coalesce(g.plan_remaining, 0) + coalesce(g.topup_remaining, 0) - coalesce(h.held, 0) - a.credit_overdraft)::integer
    as balance,
  a.credit_overdraft as overdraft
from public.agencies a
left join (
  select
    agency_id,
    sum(remaining) filter (where source <> 'topup') as plan_remaining,
    sum(remaining) filter (where source = 'topup') as topup_remaining
  from public.credit_grants
  where remaining > 0 and (expires_at is null or expires_at > now())
  group by agency_id
) g on g.agency_id = a.id
left join (
  select agency_id, sum(amount - captured - released) as held
  from public.credit_holds
  where status = 'open'
  group by agency_id
) h on h.agency_id = a.id;

comment on view public.agency_credit_balance is
  'Balance = unexpired remaining minus open holds minus overdraft (MVP_SPEC 4.2, D-54). plan_remaining covers every non top-up grant.';

-- ---------------------------------------------------------------------------
-- Internal helpers (not granted to anyone)
-- ---------------------------------------------------------------------------

-- Locks the agency row; every credit function calls this first so all changes for one agency run one at a time (D-55).
create or replace function public.credit_lock_agency(p_agency_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_overdraft integer;
begin
  select credit_overdraft into v_overdraft from public.agencies where id = p_agency_id for update;
  if not found then
    raise exception 'agency_not_found' using errcode = 'P0002';
  end if;
  return v_overdraft;
end;
$$;

-- Adds a grant, paying off any overdraft from it first. Caller holds the agency lock.
create or replace function public.credit_add_grant(
  p_agency_id uuid,
  p_source text,
  p_source_id text,
  p_amount integer,
  p_expires_at timestamptz,
  p_kind text,
  p_admin_user_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_overdraft integer;
  v_settle integer;
  v_grant_id uuid;
begin
  select credit_overdraft into v_overdraft from public.agencies where id = p_agency_id;
  v_settle := least(v_overdraft, p_amount);

  insert into public.credit_grants (agency_id, source, source_id, amount, remaining, expires_at)
  values (p_agency_id, p_source, p_source_id, p_amount, p_amount - v_settle, p_expires_at)
  returning id into v_grant_id;

  if v_settle > 0 then
    update public.agencies set credit_overdraft = credit_overdraft - v_settle where id = p_agency_id;
    insert into public.credit_transactions
      (agency_id, grant_id, delta, kind, source_type, source_id, admin_user_id, note)
    values
      (p_agency_id, v_grant_id, v_settle, 'overdraft_settle', 'overdraft_settle', v_grant_id::text, p_admin_user_id, p_note);
  end if;

  if p_amount > v_settle then
    insert into public.credit_transactions
      (agency_id, grant_id, delta, kind, source_type, source_id, admin_user_id, note)
    values
      (p_agency_id, v_grant_id, p_amount - v_settle, p_kind, p_source, p_source_id, p_admin_user_id, p_note);
  end if;

  return v_grant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- hold_credits: reserve a scan's credits at start (D-53). Refuses at a balance of 0 or less (D-54).
-- ---------------------------------------------------------------------------
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

  -- A retried job gets its existing hold back instead of a second one.
  select id into v_hold_id from public.credit_holds where scan_job_id = p_scan_job_id;
  if found then
    return v_hold_id;
  end if;

  select
    coalesce((select sum(remaining) from public.credit_grants
              where agency_id = p_agency_id and remaining > 0 and (expires_at is null or expires_at > now())), 0)
    - coalesce((select sum(amount - captured - released) from public.credit_holds
                where agency_id = p_agency_id and status = 'open'), 0)
    - v_overdraft
  into v_balance;

  if v_balance <= 0 then
    raise exception 'insufficient_credits' using errcode = 'P0001', detail = format('balance %s', v_balance);
  end if;

  insert into public.credit_holds (agency_id, scan_job_id, amount)
  values (p_agency_id, p_scan_job_id, p_amount)
  returning id into v_hold_id;

  update public.scan_jobs set hold_id = v_hold_id where id = p_scan_job_id;

  return v_hold_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- capture_credit: charge 1 held credit for a successful check. Returns false if that check was already charged.
-- ---------------------------------------------------------------------------
create or replace function public.capture_credit(p_hold_id uuid, p_check_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold public.credit_holds%rowtype;
  v_agency_id uuid;
  v_grant_id uuid;
begin
  select agency_id into v_agency_id from public.credit_holds where id = p_hold_id;
  if not found then
    raise exception 'hold_not_found' using errcode = 'P0002';
  end if;

  -- Agency first, then hold: the same lock order as every other credit function.
  perform public.credit_lock_agency(v_agency_id);
  select * into v_hold from public.credit_holds where id = p_hold_id for update;

  if exists (select 1 from public.credit_transactions where source_type = 'check' and source_id = p_check_id::text) then
    return false;
  end if;

  if v_hold.status <> 'open' then
    raise exception 'hold_closed' using errcode = 'P0001';
  end if;
  if v_hold.captured + v_hold.released >= v_hold.amount then
    raise exception 'hold_used_up' using errcode = 'P0001';
  end if;

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

  update public.credit_holds set captured = captured + 1 where id = p_hold_id;
  update public.scan_jobs set credits_charged = credits_charged + 1 where id = v_hold.scan_job_id;

  insert into public.credit_transactions (agency_id, grant_id, hold_id, delta, kind, source_type, source_id)
  values (v_agency_id, v_grant_id, p_hold_id, -1, 'capture', 'check', p_check_id::text);

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_hold: return every uncaptured credit and close the hold. Returns how many were returned.
-- ---------------------------------------------------------------------------
create or replace function public.release_hold(p_hold_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency_id uuid;
  v_hold public.credit_holds%rowtype;
  v_returned integer;
begin
  select agency_id into v_agency_id from public.credit_holds where id = p_hold_id;
  if not found then
    raise exception 'hold_not_found' using errcode = 'P0002';
  end if;

  perform public.credit_lock_agency(v_agency_id);
  select * into v_hold from public.credit_holds where id = p_hold_id for update;

  if v_hold.status = 'closed' then
    return 0;
  end if;

  v_returned := v_hold.amount - v_hold.captured - v_hold.released;
  update public.credit_holds
  set released = released + v_returned, status = 'closed', closed_at = now()
  where id = p_hold_id;

  return v_returned;
end;
$$;

-- ---------------------------------------------------------------------------
-- grant_credits: add credits from Stripe or the trial. A replayed source returns the first grant unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.grant_credits(
  p_agency_id uuid,
  p_source text,
  p_source_id text,
  p_amount integer,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if p_source_id is null or p_source_id = '' then
    raise exception 'source_id_required' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'already_expired' using errcode = '22023';
  end if;

  perform public.credit_lock_agency(p_agency_id);

  select id into v_grant_id from public.credit_grants where source = p_source and source_id = p_source_id;
  if found then
    return v_grant_id;
  end if;

  return public.credit_add_grant(p_agency_id, p_source, p_source_id, p_amount, p_expires_at, 'grant', null, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_grants: zero every grant past its expiry (pg_cron). Returns how many grants were expired.
-- ---------------------------------------------------------------------------
create or replace function public.expire_grants()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency_id uuid;
  v_grant record;
  v_count integer := 0;
begin
  for v_agency_id in
    select distinct agency_id from public.credit_grants
    where remaining > 0 and expires_at <= now()
    order by agency_id
  loop
    perform public.credit_lock_agency(v_agency_id);

    for v_grant in
      select id, remaining from public.credit_grants
      where agency_id = v_agency_id and remaining > 0 and expires_at <= now()
      for update
    loop
      update public.credit_grants set remaining = 0 where id = v_grant.id;
      insert into public.credit_transactions (agency_id, grant_id, delta, kind, source_type, source_id)
      values (v_agency_id, v_grant.id, -v_grant.remaining, 'expire', 'expire', v_grant.id::text);
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_adjust_credits: add (never-expiring admin grant) or remove credits by hand. Returns the ledger row ID.
-- p_request_id is made once per admin submit, so a double submit applies once (D-55).
-- ---------------------------------------------------------------------------
create or replace function public.admin_adjust_credits(
  p_agency_id uuid,
  p_delta integer,
  p_admin_user_id uuid,
  p_note text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant_id uuid;
  v_left integer;
  v_grant record;
  v_take integer;
  v_tx_id uuid;
begin
  if p_delta is null or p_delta = 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if p_admin_user_id is null or p_note is null or btrim(p_note) = '' then
    raise exception 'admin_and_note_required' using errcode = '22023';
  end if;
  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '22023';
  end if;

  perform public.credit_lock_agency(p_agency_id);

  -- A replayed addition finds its grant; a replayed removal finds its ledger row.
  select id into v_grant_id from public.credit_grants where source = 'admin' and source_id = p_request_id::text;
  if not found then
    select id into v_tx_id from public.credit_transactions where source_type = 'admin' and source_id = p_request_id::text;
    if found then
      return v_tx_id;
    end if;
    if p_delta > 0 then
      v_grant_id := public.credit_add_grant(
        p_agency_id, 'admin', p_request_id::text, p_delta, null, 'admin_adjust', p_admin_user_id, p_note
      );
    end if;
  end if;

  if v_grant_id is not null then
    select id into v_tx_id from public.credit_transactions
    where grant_id = v_grant_id order by kind = 'admin_adjust' desc limit 1;
    return v_tx_id;
  end if;

  -- Removal: soonest-expiring grants first; whatever they cannot cover becomes overdraft.
  v_left := -p_delta;
  for v_grant in
    select id, remaining from public.credit_grants
    where agency_id = p_agency_id and remaining > 0 and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, created_at, id
    for update
  loop
    exit when v_left = 0;
    v_take := least(v_grant.remaining, v_left);
    update public.credit_grants set remaining = remaining - v_take where id = v_grant.id;
    v_left := v_left - v_take;
  end loop;

  if v_left > 0 then
    update public.agencies set credit_overdraft = credit_overdraft + v_left where id = p_agency_id;
  end if;

  insert into public.credit_transactions (agency_id, delta, kind, source_type, source_id, admin_user_id, note)
  values (p_agency_id, p_delta, 'admin_adjust', 'admin', p_request_id::text, p_admin_user_id, p_note)
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Only the service role (worker, Stripe webhook, admin actions) may call these.
-- ---------------------------------------------------------------------------
revoke all on function
  public.credit_lock_agency(uuid),
  public.credit_add_grant(uuid, text, text, integer, timestamptz, text, uuid, text),
  public.hold_credits(uuid, integer, uuid),
  public.capture_credit(uuid, uuid),
  public.release_hold(uuid),
  public.grant_credits(uuid, text, text, integer, timestamptz),
  public.expire_grants(),
  public.admin_adjust_credits(uuid, integer, uuid, text, uuid)
from public, anon, authenticated;

revoke all on function
  public.credit_lock_agency(uuid),
  public.credit_add_grant(uuid, text, text, integer, timestamptz, text, uuid, text)
from service_role;

grant execute on function
  public.hold_credits(uuid, integer, uuid),
  public.capture_credit(uuid, uuid),
  public.release_hold(uuid),
  public.grant_credits(uuid, text, text, integer, timestamptz),
  public.expire_grants(),
  public.admin_adjust_credits(uuid, integer, uuid, text, uuid)
to service_role;
