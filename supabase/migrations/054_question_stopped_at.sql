-- Migration 054: past scores keep the questions they were scored with (step 9e). Additive only (D-43): two new
-- nullable columns and a trigger on tracked_prompts; nothing is dropped or rewritten.
--
-- Removing a question deleted its row, and with it (on delete cascade) every saved answer to it, so past weekly
-- scores changed. Pausing kept the answers but the score history read only active questions, so past points moved
-- too. Now:
--   inactive_since: when the question stopped being asked (paused, retired or removed). Past scores still count
--     its answers up to that moment; today's score does not (BUG-129 stands for the current score). Null while it
--     is active, and for questions paused before this migration, whose stop time is unknown: those stay left out
--     of every point, as before, so no existing history moves.
--   removed_at: the user removed it. It is hidden from every list and never asked again, but its answers are kept.

alter table public.tracked_prompts
  add column if not exists inactive_since timestamptz,
  add column if not exists removed_at timestamptz;

-- Every path that pauses or resumes a question (the Questions page, onboarding, an industry change, cleanups)
-- records the moment here, so none can forget it.
create or replace function public.tracked_prompts_stop_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active and not old.active then
    new.inactive_since := null;
  elsif old.active and not new.active and new.inactive_since is null then
    new.inactive_since := now();
  end if;
  return new;
end;
$$;

drop trigger if exists tracked_prompts_stop_time on public.tracked_prompts;
create trigger tracked_prompts_stop_time
  before update of active on public.tracked_prompts
  for each row execute function public.tracked_prompts_stop_time();
