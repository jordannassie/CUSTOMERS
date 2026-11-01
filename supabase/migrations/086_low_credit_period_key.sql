-- 086: the low-credit email is keyed on a credit period that does not move (BUG-280). Additive only.
--
-- low_credit_agencies (070) gives period_end as agencies.current_period_end while it is ahead, else the latest grant
-- expiry. That value changes inside one period: when the renewal date passes before the webhook updates it, and when
-- a trial gets its period from the webhook. The email's key held period_end, so each change sent the email again.
--
-- low_credit_alerts: low_credit_agencies plus
--   period_key        the expiry of the newest plan or trial grant, expired or not. A renewal grants again and moves
--                     it; nothing else does (an admin trial extension also moves it, so the job also checks
--                     period_started_at below).
--   period_started_at when that period's first plan or trial grant was made. The email job sends nothing to an
--                     agency already emailed at the same level since then, whatever the key.
-- low_credit_agencies stays as it is for the code already live.

create or replace function public.low_credit_alerts()
returns table (
  agency_id uuid,
  level text,
  used integer,
  total integer,
  balance integer,
  period_end timestamptz,
  period_key timestamptz,
  period_started_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select g.agency_id, max(g.expires_at) as period_key
    from public.credit_grants g
    where g.source in ('plan', 'trial') and g.expires_at is not null
    group by g.agency_id
  ),
  started as (
    select l.agency_id, l.period_key, min(g.created_at) as period_started_at
    from latest l
    join public.credit_grants g
      on g.agency_id = l.agency_id and g.source in ('plan', 'trial') and g.expires_at = l.period_key
    group by l.agency_id, l.period_key
  )
  select a.agency_id, a.level, a.used, a.total, a.balance, a.period_end, s.period_key, s.period_started_at
  from public.low_credit_agencies() a
  left join started s on s.agency_id = a.agency_id;
$$;

revoke all on function public.low_credit_alerts() from public, anon, authenticated;
grant execute on function public.low_credit_alerts() to service_role;
