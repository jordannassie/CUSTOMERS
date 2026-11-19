-- Migration 046: when saved answers were first checked for each competitor (BUG-122).
-- A competitor added partway through the 30 days showed "New, still collecting" until the window rolled over, since
-- only scans after it was added looked for it. Saved answers are now checked again when the competitor list changes,
-- and this records how far back that reached. Null means only scans after created_at looked for it.

alter table public.business_competitors add column if not exists checked_from timestamptz;

comment on column public.business_competitors.checked_from is
  'Earliest saved answer checked for this competitor (recount of saved answers); null: only scans after created_at.';
