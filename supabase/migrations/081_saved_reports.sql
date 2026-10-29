-- 081: tell the snapshots an owner saved apart from the reports saved automatically (D-90). Additive only.
--
-- reports.saved: true for a snapshot saved with "Save snapshot", listed under Saved reports. Reports saved
--   automatically (the latest report behind a live share link, the weekly email and the Reports page) stay false and
--   are not listed, so the list holds only what the owner chose to keep.
-- Existing rows: reports from before the PDF (version 1) were all saved by hand, and a report a share link points at
--   was a snapshot saved for that link, so both count as saved.

alter table public.reports add column if not exists saved boolean not null default false;

update public.reports r
set saved = true
where not r.saved
  and (
    coalesce(r.snapshot ->> 'version', '1') <> '2'
    or exists (select 1 from public.report_shares s where s.report_id = r.id)
  );
