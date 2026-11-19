-- A Beehiiv "submitted" message is a confirmed signup. A click is not.
-- Safe if 028 was applied with the earlier check list.

alter table public.newsletter_events drop constraint if exists newsletter_events_event_check;

alter table public.newsletter_events
  add constraint newsletter_events_event_check
  check (event in ('impression', 'click', 'confirmed'));
