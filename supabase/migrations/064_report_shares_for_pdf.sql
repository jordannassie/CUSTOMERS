-- Migration 064: PDF export links are their own rows (2026-10-16, B-60). Additive only (D-43): one new column.
--
-- A PDF export opens the report through a short-lived share link and turns it off afterwards. Before this, the Share
-- button and the weekly email reused any live link, so pressing Share during an export could hand out the PDF's link,
-- which then stopped working. Rows with for_pdf = true are made and turned off only by the PDF export; Share, the
-- weekly email and "turn off link" ignore them. The public /r/<token> page still opens them while they are live.
-- RLS on report_shares is unchanged.

alter table public.report_shares add column if not exists for_pdf boolean not null default false;
