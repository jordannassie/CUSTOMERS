-- Migration 036: when an agency was soft deleted, so an admin can restore it within 30 days (B-65, B-77, MVP_SPEC 23, D-77).
-- Additive only (D-43). Account deletion (B-77) sets it together with status 'deleted'.

alter table public.agencies
  add column if not exists deleted_at timestamptz;
