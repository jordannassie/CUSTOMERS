-- Allow detail-page views and review-link clicks in the existing click log.
-- Safe to apply after 025. Public pages still work if this has not been applied.

alter table public.directory_clicks drop constraint if exists directory_clicks_source_check;
alter table public.directory_clicks
  add constraint directory_clicks_source_check
  check (source in ('homepage', 'directory', 'detail'));

alter table public.directory_clicks drop constraint if exists directory_clicks_destination_check;
alter table public.directory_clicks
  add constraint directory_clicks_destination_check
  check (destination in ('affiliate', 'direct', 'review', 'view'));
