-- Migration 056: a Stripe event is claimed before it is handled, so two deliveries of it at once cannot both run.
-- Additive only (D-43): one nullable column; existing rows read as finished, as before.
--
-- The webhook read stripe_webhook_events, ran the handler, then wrote the row: two deliveries arriving together both
-- read "new" and both ran. Credits and emails were still applied once (ledger and email keys), but other writes ran
-- twice. Now a delivery first inserts the row with claimed_at set (stripe_event_id is already unique), and finishing
-- clears claimed_at. A second delivery meanwhile gets 409 and Stripe sends it again later. A claim left by a crash is
-- taken over after a few minutes. claimed_at is separate from error, so a running event never sets off the
-- "Stripe webhook failed" admin alert (migration 037), which reads error.

alter table public.stripe_webhook_events
  add column if not exists claimed_at timestamptz;
