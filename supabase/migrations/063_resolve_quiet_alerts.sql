-- Migration 063: admin alerts close themselves once their check has been clean for an hour (2026-10-15, MVP_SPEC 22,
-- D-76). Additive only (D-43): one new function, and run_system_alerts() (037) calls it after the checks.
--
-- check_system_alerts() and the app's fallback alert refresh last_seen_at each time they still find the problem, so
-- an alert not seen for an hour is one whose check has been clean that long. Only these kinds close on their own;
-- the others (webhook failures, Anthropic credit, daily AI cost) still wait for an admin.

create or replace function public.resolve_quiet_system_alerts(p_quiet interval default interval '1 hour')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.system_alerts
  set resolved_at = now()
  where resolved_at is null
    and kind in ('stuck_jobs', 'failed_scans', 'ai_fallback', 'provider_errors', 'negative_balances')
    and last_seen_at < now() - p_quiet;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Same as 037, with the quiet alerts closed after the checks have had their chance to refresh them.
create or replace function public.run_system_alerts()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  perform public.check_system_alerts();
  perform public.resolve_quiet_system_alerts();

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'system_alerts_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'scan_worker_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return null;
  end if;

  return net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function public.resolve_quiet_system_alerts(interval) from public, anon, authenticated;
grant execute on function public.resolve_quiet_system_alerts(interval) to service_role;
