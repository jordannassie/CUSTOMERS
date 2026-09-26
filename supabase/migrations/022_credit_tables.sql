-- Migration 022: credit tables (B-12, MVP_SPEC 4.2, 13, D-53, D-55, D-58).
-- Additive only (D-43). Rows change only through the credit SQL functions (B-13), run as the service role.

-- ---------------------------------------------------------------------------
-- credit_grants: every grant is its own row, spent soonest-expiring first (MVP_SPEC 4.2)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  source text not null check (source in ('plan', 'topup', 'trial', 'promo', 'admin', 'refund')),
  -- Stripe invoice line ID, checkout session ID or audit log ID, so a replay cannot grant twice.
  source_id text not null,
  business_id uuid references public.businesses(id) on delete set null,
  amount integer not null check (amount > 0),
  remaining integer not null check (remaining between 0 and amount),
  -- Null means the grant never expires (top-ups).
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);

-- Spending order: soonest expiry first, never-expiring last.
create index if not exists credit_grants_spend_order_idx
  on public.credit_grants (agency_id, expires_at asc nulls last)
  where remaining > 0;

alter table public.credit_grants enable row level security;

create policy "credit_grants_agency_select" on public.credit_grants
  for select to authenticated using (
    agency_id in (select a.id from public.agencies a where a.owner_user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- credit_holds: credits reserved when a scan starts (D-53)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_holds (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  scan_job_id uuid unique references public.scan_jobs(id) on delete set null,
  amount integer not null check (amount > 0),
  captured integer not null default 0 check (captured >= 0),
  released integer not null default 0 check (released >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (captured + released <= amount),
  check ((status = 'closed') = (closed_at is not null))
);

create index if not exists credit_holds_open_idx on public.credit_holds (agency_id)
  where status = 'open';

alter table public.credit_holds enable row level security;

-- Needed by agency_credit_balance, which runs with the caller's rights.
create policy "credit_holds_agency_select" on public.credit_holds
  for select to authenticated using (
    agency_id in (select a.id from public.agencies a where a.owner_user_id = (select auth.uid()))
  );

-- Foreign key deferred from B-11 until this table existed.
alter table public.scan_jobs
  add constraint scan_jobs_hold_id_fkey foreign key (hold_id)
  references public.credit_holds(id) on delete set null;

-- ---------------------------------------------------------------------------
-- credit_transactions: append-only ledger, the source of truth (MVP_SPEC 13)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  -- Set null, not cascade: on account deletion the ledger is anonymised, never deleted (MVP_SPEC 23).
  agency_id uuid references public.agencies(id) on delete set null,
  grant_id uuid references public.credit_grants(id) on delete set null,
  hold_id uuid references public.credit_holds(id) on delete set null,
  delta integer not null check (delta <> 0),
  kind text not null
    check (kind in ('grant', 'capture', 'release', 'expire', 'admin_adjust', 'overdraft_settle')),
  source_type text not null,
  source_id text not null,
  admin_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  -- D-55: a retried job, check or Stripe event can never apply twice.
  unique (source_type, source_id)
);

create index if not exists credit_transactions_agency_created_idx
  on public.credit_transactions (agency_id, created_at desc);
create index if not exists credit_transactions_grant_id_idx on public.credit_transactions (grant_id);
create index if not exists credit_transactions_hold_id_idx on public.credit_transactions (hold_id);

alter table public.credit_transactions enable row level security;

create policy "credit_transactions_agency_select" on public.credit_transactions
  for select to authenticated using (
    agency_id in (select a.id from public.agencies a where a.owner_user_id = (select auth.uid()))
  );

-- Signed-in users read their own rows through the policies above; only the service role writes.
revoke all on public.credit_grants, public.credit_holds, public.credit_transactions from anon, authenticated;
grant select on public.credit_grants, public.credit_holds, public.credit_transactions to authenticated;

-- ---------------------------------------------------------------------------
-- agency_credit_balance: balance with the plan / top-up split for the usage widget and page
-- ---------------------------------------------------------------------------
create or replace view public.agency_credit_balance
with (security_invoker = true) as
select
  a.id as agency_id,
  coalesce(g.plan_remaining, 0)::integer as plan_remaining,
  coalesce(g.topup_remaining, 0)::integer as topup_remaining,
  coalesce(h.held, 0)::integer as held,
  (coalesce(g.plan_remaining, 0) + coalesce(g.topup_remaining, 0) - coalesce(h.held, 0))::integer as balance
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
  'Balance = unexpired remaining minus open holds (MVP_SPEC 4.2). plan_remaining covers every non top-up grant.';

revoke all on public.agency_credit_balance from anon, authenticated;
grant select on public.agency_credit_balance to authenticated;
