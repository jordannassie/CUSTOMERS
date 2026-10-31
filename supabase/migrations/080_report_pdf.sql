-- 080: the 10-page PDF report (D-90). Additive only.
--
-- agencies.report_branding: the agency's report settings: { accent?: "#1F4FD1", contactEmail?: string,
--   bookingUrl?: string }. Read by the report builder; written only by the server after an ownership check.
-- reports.pdf_path: where a snapshot's PDF is stored in the private "reports" bucket, so the share link and the
--   email serve the same file; null until it is drawn.
-- opportunities.source 'report': a fix the report's rules found (one list with Actions, D-92). Kept apart from 'scan'
--   so a scan's save never removes it.
-- storage bucket "reports": private PDFs, read only through signed URLs the server makes.

alter table public.agencies add column if not exists report_branding jsonb not null default '{}'::jsonb;

alter table public.reports add column if not exists pdf_path text;

alter table public.opportunities drop constraint if exists opportunities_source_check;
alter table public.opportunities
  add constraint opportunities_source_check check (source in ('scan', 'comparison', 'sources', 'manual', 'report'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
