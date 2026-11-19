-- Migration 051: signed-in and anonymous users can never truncate a table (fix list B8).
-- Additive only (D-43): removes a privilege nobody uses.
--
-- Supabase grants every privilege on new tables to anon and authenticated and relies on row level security to
-- limit them. TRUNCATE is not covered by row level security, so a user holding it could empty a whole table
-- through the API. The app never truncates; only the service role and the database owner keep the privilege.

revoke truncate on all tables in schema public from anon, authenticated;

-- Tables made by later migrations start without it too.
alter default privileges in schema public revoke truncate on tables from anon, authenticated;
