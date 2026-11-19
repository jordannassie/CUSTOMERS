-- 091 (SEC-11): no function in public is executable by PUBLIC, anon or authenticated.
--
-- Built from these files every function is already closed (each migration revokes right after it creates). A database
-- built another way, for example restored from a dump taken without privileges, keeps PostgreSQL's default EXECUTE for
-- PUBLIC and Supabase's grants to anon and authenticated instead. This file sets the end state whatever built the
-- database, keeps the service role's access, and fails (rolling back) if anything is still open.
--
-- Nothing needs them open: the app calls every function in public with the service role (createServiceClient in the
-- dal files), pg_cron runs them as postgres (their owner), RLS policies use only auth.uid() and auth.role(), and
-- trigger functions fire without any EXECUTE grant.
--
-- Privileges only: no data or schema changes (D-43). Safe to run twice.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as fn, p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind in ('f', 'p')
      -- Functions an extension owns are the extension's business.
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.fn);
    -- Called only from inside the other credit functions, never by the app (023).
    if f.proname in ('credit_lock_agency', 'credit_add_grant') then
      execute format('revoke all on function %s from service_role', f.fn);
    else
      execute format('grant execute on function %s to service_role', f.fn);
    end if;
  end loop;
end $$;

-- Supabase's own default grants to anon and authenticated on new functions in public. Each migration still revokes
-- from public itself (npm run check:rls checks that from 091 on).
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- Fail if anything is still open, for example a function postgres does not own, where a revoke only warns.
do $$
declare
  v_open text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.proname)
  into v_open
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prokind in ('f', 'p')
    and not exists (
      select 1 from pg_depend d
      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
    )
    and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open is not null then
    raise exception 'Still executable by anon or authenticated: %', v_open;
  end if;
end $$;
