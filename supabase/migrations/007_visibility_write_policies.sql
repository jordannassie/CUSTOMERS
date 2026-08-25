-- Migration 006 enabled RLS on visibility_runs, visibility_results, and
-- visibility_scores but only added SELECT policies. The app's own write
-- path (src/lib/geo/run-visibility.ts, called from the "Run New Scan"
-- button via the user's RLS-scoped Supabase client, NOT the service role)
-- needs to INSERT into all three tables and UPDATE visibility_runs — with
-- no permissive policy for those commands, Postgres RLS denies them by
-- default, which is why every scan attempt failed at
-- `supabase.from("visibility_runs").insert(...)` with a generic
-- "Could not create a visibility run." error, before ever reaching an AI
-- provider. This migration adds the missing INSERT/UPDATE policies, using
-- the same owner-via-businesses pattern as the existing SELECT policies
-- and as tracked_prompts_owner_all / opportunities_owner_all elsewhere in
-- migration 006.

create policy "visibility_runs_owner_insert" on public.visibility_runs
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

create policy "visibility_runs_owner_update" on public.visibility_runs
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

create policy "visibility_results_owner_insert" on public.visibility_results
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );

create policy "visibility_scores_owner_insert" on public.visibility_scores
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid())
  );
