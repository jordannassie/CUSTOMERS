-- Migration 024: columns the existing-data move needs (B-14, MVP_SPEC 19 step 1, D-69).
-- Additive only (D-43). Values are filled by 025_backfill_existing_data.sql.

-- Where a question came from: the industry library, the user, or the old app (MVP_SPEC 5.3, 19).
-- Nullable until 025 has labelled the old rows, which then sets the default and not null.
alter table public.tracked_prompts
  add column if not exists source text check (source in ('library', 'custom', 'legacy'));
