-- 079: tables the app writes only on the server (audit, 2026-10-28).
--
-- feature_requests: "Suggest a feature" saves through the server (src/modules/feedback/dal.ts, service role), which
-- rate limits, validates, sets status 'new' and checks the business is the user's own. The old insert policy let a
-- signed-in user write rows straight through the API instead: any status, a future created_at, any business id.
-- Owners keep reading their own requests (feature_requests_select_own).
--
-- reports: saved report snapshots are written only by the server (src/modules/reports/saved/dal.ts). RLS has no
-- write policy today; revoking the grants as well (like 047, 062 and 077) keeps a later policy from letting owners
-- change a frozen snapshot that a public share link shows.

drop policy if exists "feature_requests_insert" on public.feature_requests;
revoke insert, update, delete on public.feature_requests from anon, authenticated;

revoke insert, update, delete on public.reports from authenticated;
