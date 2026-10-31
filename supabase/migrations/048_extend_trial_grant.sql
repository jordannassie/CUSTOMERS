-- Migration 048: extending a trial extends its credits (A3, MVP_SPEC 4.4, 9.1). Additive only (D-43).
--
-- The admin "Extend trial" action moved agencies.trial_ends_at and the Stripe trial, but the trial grant kept its old
-- expires_at, so the extra days had no trial credits. extend_trial_grant moves the agency's open trial grant (credits
-- left, not yet swept by expire_grants) to the new trial end, under the same agency lock as every credit function
-- (D-55). It never shortens a grant. Returns the grant's ID, or null when no open trial grant is left.

create or replace function public.extend_trial_grant(
  p_agency_id uuid,
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

  update public.credit_grants
  set expires_at = p_expires_at
  where agency_id = p_agency_id
    and source = 'trial'
    and remaining > 0
    and expires_at is not null
    and expires_at < p_expires_at
  returning id into v_grant_id;

  return v_grant_id;
end;
$$;

revoke all on function public.extend_trial_grant(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.extend_trial_grant(uuid, timestamptz) to service_role;
