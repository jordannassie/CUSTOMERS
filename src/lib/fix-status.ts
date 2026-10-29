/**
 * The saved fix statuses that are still to do: Suggested (open), To do and In progress (migration 078). Every
 * database read that means "open fixes" uses this list, so a fix the owner accepted never drops out of one screen.
 */
export const OPEN_FIX_STATUSES = ["open", "todo", "in_progress"];
