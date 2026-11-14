-- 061: when "why competitors win" finished for a scan run (MVP_SPEC 7.2). The Opportunities page and the Overview's
-- "What to fix first" say "Working out your fixes" while the latest completed run has none yet, instead of "No fixes
-- yet, run a scan" (2026-10-14). Set by explainAfterScan whether it wrote new fixes, kept the old ones or failed.
-- Additive (D-43): runs before this migration stay null and are old enough to count as done.

alter table public.visibility_runs add column if not exists explained_at timestamptz;
