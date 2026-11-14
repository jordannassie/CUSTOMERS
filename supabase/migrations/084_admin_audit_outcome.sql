-- 084: admin history is written before the change it records (BUG-278). Additive only.
--
-- An admin action used to make its change first and write admin_audit_log after, as a separate insert; when that
-- insert failed the change stayed and history never showed it. Now the row is written first as 'started', the change
-- runs, and the row is marked 'done' or 'failed'. A row left at 'started' means the result was not confirmed: the
-- change may have happened, so it is still on record. Rows written before this migration, and rows the SQL functions
-- write in the same transaction as their change (refund_topup_grant), are 'done'.

alter table public.admin_audit_log
  add column if not exists outcome text not null default 'done',
  add column if not exists finished_at timestamptz;

alter table public.admin_audit_log drop constraint if exists admin_audit_log_outcome_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_outcome_check check (outcome in ('started', 'done', 'failed'));
