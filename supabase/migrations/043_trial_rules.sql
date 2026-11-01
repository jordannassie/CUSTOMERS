-- Migration 043: trial rules (B-45, MVP_SPEC 4.4, D-16, D-17, F-43). Additive only (D-43).
--
-- 1. agencies.cancel_at: when a pending cancel takes effect (Stripe cancel_at_period_end), kept by the webhook,
--    so the app banner can say "You won't be charged" without calling Stripe on every page.
-- 2. grant_trial_credits: the trial grant, at most once per agency (F-43), under the same agency lock as every
--    other credit function (D-55).

alter table public.agencies add column if not exists cancel_at timestamptz;

comment on column public.agencies.cancel_at is
  'When the subscription ends because the owner cancelled it; null when nothing is pending. Written by the Stripe webhook only.';

-- Returns the grant ID, the first grant again for a replayed source, or null when the agency already had a
-- trial (a second trial start grants nothing).
create or replace function public.grant_trial_credits(
  p_agency_id uuid,
  p_source_id text,
  p_amount integer,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant_id uuid;
begin
  perform public.credit_lock_agency(p_agency_id);

  select id into v_grant_id from public.credit_grants where source = 'trial' and source_id = p_source_id;
  if found then
    return v_grant_id;
  end if;

  if exists (select 1 from public.credit_grants where agency_id = p_agency_id and source = 'trial') then
    return null;
  end if;

  return public.grant_credits(p_agency_id, 'trial', p_source_id, p_amount, p_expires_at);
end;
$$;

revoke all on function public.grant_trial_credits(uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.grant_trial_credits(uuid, text, integer, timestamptz) to service_role;
