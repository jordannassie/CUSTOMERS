// Date range rules for the Scans filter: quick choices, the month grid and the button label. Days are YYYY-MM-DD in
// UTC, the same days the list filters by. Pure, so it is tested.

export type DayRange = { from?: string; to?: string };

const DAY = 86_400_000;
export const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

export type Preset = { key: string; label: string; range: (now: Date) => DayRange };

export const PRESETS: Preset[] = [
  { key: "today", label: "Today", range: (now) => ({ from: toDay(now.getTime()), to: toDay(now.getTime()) }) },
  { key: "7", label: "Last 7 days", range: (now) => ({ from: toDay(now.getTime() - 6 * DAY), to: toDay(now.getTime()) }) },
  { key: "30", label: "Last 30 days", range: (now) => ({ from: toDay(now.getTime() - 29 * DAY), to: toDay(now.getTime()) }) },
  {
    key: "month",
    label: "This month",
    range: (now) => ({ from: toDay(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: toDay(now.getTime()) }),
  },
  {
    key: "last-month",
    label: "Last month",
    range: (now) => ({
      from: toDay(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
      to: toDay(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)),
    }),
  },
  { key: "any", label: "Any date", range: () => ({}) },
];

/** The weeks of a month, Monday first; days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = Date.UTC(year, month, 1);
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toDay(first + i * DAY))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** How far back the calendar goes: scans older than a year are not worth picking by hand (2026-11-12). */
export const MONTHS_BACK = 12;

export type MonthView = { year: number; month: number };

/** The months the calendar may show: from MONTHS_BACK months ago to this month, never the future. */
export function monthBounds(now: Date): { first: MonthView; last: MonthView } {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_BACK, 1));
  return { first: { year: first.getUTCFullYear(), month: first.getUTCMonth() }, last: { year: now.getUTCFullYear(), month: now.getUTCMonth() } };
}

const monthIndex = (v: MonthView) => v.year * 12 + v.month;

/** The month the calendar opens on: the chosen start, kept inside the allowed months. */
export function openingMonth(range: DayRange, now: Date): MonthView {
  const { first, last } = monthBounds(now);
  const day = range.from ?? range.to;
  const view = day ? { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 } : last;
  if (monthIndex(view) < monthIndex(first)) return first;
  if (monthIndex(view) > monthIndex(last)) return last;
  return view;
}

/** Whether the arrow may move the calendar by this many months. */
export function canMove(view: MonthView, by: number, now: Date): boolean {
  const { first, last } = monthBounds(now);
  const next = monthIndex(view) + by;
  return next >= monthIndex(first) && next <= monthIndex(last);
}

/** A day can be picked from the first allowed month up to today. */
export function selectable(day: string, now: Date): boolean {
  const { first } = monthBounds(now);
  const t = dayMs(day);
  return t >= Date.UTC(first.year, first.month, 1) && t <= dayMs(toDay(now.getTime()));
}

/** A click on a day: the first click starts a range, the second ends it (in either order). */
export function pickDay(range: DayRange, day: string, picking: boolean): { range: DayRange; done: boolean } {
  if (!picking || !range.from) return { range: { from: day, to: undefined }, done: false };
  return dayMs(day) < dayMs(range.from) ? { range: { from: day, to: range.from }, done: true } : { range: { from: range.from, to: day }, done: true };
}

export function inRange(day: string, range: DayRange): boolean {
  if (!range.from) return false;
  const t = dayMs(day);
  return t >= dayMs(range.from) && t <= dayMs(range.to ?? range.from);
}

const short = (day: string, year: boolean) =>
  new Date(dayMs(day)).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year && { year: "numeric" }), timeZone: "UTC" });

/** "Any date", "Nov 12, 2026", "Nov 1 to Nov 12, 2026" or "Since Nov 1, 2026" (no dashes, WRITING.md). */
export function rangeLabel(range: DayRange): string {
  const { from, to } = range;
  if (!from && !to) return "Any date";
  if (from && !to) return `Since ${short(from, true)}`;
  if (!from && to) return `Until ${short(to, true)}`;
  if (from === to) return short(from!, true);
  const sameYear = from!.slice(0, 4) === to!.slice(0, 4);
  return `${short(from!, !sameYear)} to ${short(to!, true)}`;
}
