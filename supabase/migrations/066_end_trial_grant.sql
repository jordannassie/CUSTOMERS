-- Migration 066: trial credits end when the trial ends, also when it ends early (2026-10-16, MVP_SPEC 4.4, D-17).
-- Additive only (D-43): one new credit function.
--
-- "Start my plan now" ends a trial today, but the trial grant kept its old expiry, so the remaining trial credits
-- stayed spendable next to the plan credits for the rest of the old trial. end_trial_grant moves the agency's open
-- trial grant to the real trial end and, when that is already past, takes what is left out of the balance with an
-- 'expire' ledger row, the same way expire_grants does. Same agency lock as every credit function (D-55). It never
-- lengthens a grant (extend_trial_grant, 048, does that), so running it again changes nothing. Returns the credits
-- removed.

create or replace function public.end_trial_grant(
  p_agency_id uuid,
  p_trial_end timestamptz
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
  perform public.credit_lock_agency(p_agency_id);

  for v_grant in
    select id, remaining from public.credit_grants
    where agency_id = p_agency_id
      and source = 'trial'
      and remaining > 0
      and expires_at is not null
      and expires_at > p_trial_end
    for update
  loop
    update public.credit_grants set expires_at = p_trial_end where id = v_grant.id;
    if p_trial_end <= now() then
      update public.credit_grants set remaining = 0 where id = v_grant.id;
      insert into public.credit_transactions (agency_id, grant_id, delta, kind, source_type, source_id)
      values (p_agency_id, v_grant.id, -v_grant.remaining, 'expire', 'expire', v_grant.id::text);
      v_removed := v_removed + v_grant.remaining;
    end if;
  end loop;

  return v_removed;
end;
$$;

revoke all on function public.end_trial_grant(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.end_trial_grant(uuid, timestamptz) to service_role;
