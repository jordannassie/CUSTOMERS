-- Migration 049: a plan chosen before setting up another business (B-xx, "See plans" from Billing).
-- Additive only (D-43).
--
-- businesses.requested_plan_id: set only when the owner picked a plan on /settings/billing/plans/new-business
-- before starting the wizard for a business after their first. Null means "Set up another business" was used
-- instead, which keeps matching the agency's other businesses' plan, as before. Read once, by the "add this
-- business to your plan" step (setup-add-on.ts); ignored once the business has its own business_subscriptions row.

alter table public.businesses add column if not exists requested_plan_id text references public.plans(id);

comment on column public.businesses.requested_plan_id is
  'The plan chosen on the new-business plan picker before setup started. Null means auto-match the agency''s other businesses. Ignored once the business is on a plan.';
