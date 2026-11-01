-- Migration 053: the low credits email fires only when the credits left are really low (step 9d). Additive only
-- (D-43): replaces one function, same name, arguments and result; no table changes.
--
-- 038 called an agency low when 80% of this period's plan and trial credits were "used", counted as amount minus
-- remaining. A renewal that paid back an overdraft, or a period whose plan credits ran out while top-up credits
-- remained, looked 80% used though plenty was left, and the email went out at once. Now 'low' also needs the
-- spendable balance (plan, trial and top-up credits, a running scan's hold counted as not spent) to be at or below
-- a fifth of the period's credits: the same rule as the 80% banner in the app (MVP_SPEC 4.2). 'empty' and
-- 'negative' are unchanged.

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
      p.period_end
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

revoke all on function public.low_credit_agencies() from public, anon, authenticated;
grant execute on function public.low_credit_agencies() to service_role;
