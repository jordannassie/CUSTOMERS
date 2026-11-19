-- Functions in public that anon or authenticated can run through /rest/v1/rpc (SEC-11). Expect no rows.
-- Run by npm run db:ohio after every apply; run it on live before go-live too.
select p.oid::regprocedure::text
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.prokind in ('f', 'p')
  and not exists (
    select 1 from pg_depend d
    where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
  )
  and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
order by 1;
