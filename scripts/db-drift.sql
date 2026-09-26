-- One line per schema fact that migrations control; scripts/db-drift.sh diffs local against the linked project.
select k from (
  select 'col ' || table_name || '.' || column_name || ' ' || data_type || ' null=' || is_nullable || ' def=' || coalesce(column_default, '') as k
    from information_schema.columns where table_schema = 'public'
  union all select 'con ' || conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid)
    from pg_constraint where connamespace = 'public'::regnamespace
  union all select 'idx ' || indexdef from pg_indexes where schemaname = 'public'
  union all select 'pol ' || schemaname || '.' || tablename || ' ' || policyname || ' ' || cmd || ' ' || array_to_string(roles, ',')
      || ' q=' || coalesce(qual, '') || ' c=' || coalesce(with_check, '')
    from pg_policies where schemaname in ('public', 'storage')
  union all select 'rls ' || relname || ' ' || relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
  union all select 'fn ' || p.oid::regprocedure || ' ' || md5(pg_get_functiondef(p.oid)) from pg_proc p where pronamespace = 'public'::regnamespace
  union all select 'trg ' || tgrelid::regclass || ' ' || tgname || ' ' || md5(pg_get_triggerdef(oid))
    from pg_trigger where not tgisinternal and tgrelid::regclass::text not like 'realtime.%' and tgrelid::regclass::text not like 'storage.%'
  union all select 'grant ' || table_name || ' ' || grantee || ' ' || privilege_type from information_schema.role_table_grants where table_schema = 'public'
  union all select 'fgrant ' || routine_name || ' ' || grantee from information_schema.routine_privileges where routine_schema = 'public'
  union all select 'view ' || viewname || ' ' || md5(definition) from pg_views where schemaname = 'public'
  union all select 'type ' || typname || ' ' || typtype::text from pg_type where typnamespace = 'public'::regnamespace and typtype in ('e', 'd', 'c') and typrelid = 0
  union all select 'seq ' || sequencename from pg_sequences where schemaname = 'public'
  union all select 'ext ' || extname || ' ' || extnamespace::regnamespace from pg_extension
  union all select 'pub ' || pubname || ' ' || coalesce((select string_agg(tablename, ',' order by tablename) from pg_publication_tables t where t.pubname = p.pubname), '')
    from pg_publication p
  union all select 'bucket ' || id || ' ' || public from storage.buckets
) facts
order by k;
