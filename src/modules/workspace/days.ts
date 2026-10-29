// Day counts for the usage widget and banners. Pure.
import { validTimeZone } from "@/lib/time-zone";

const DAY = 24 * 60 * 60 * 1000;

/** Calendar days to the date in the zone its date is written in (UTC when unknown): later today is 0, not 1. */
export function daysUntil(date: Date, now: Date, timeZone = "UTC"): number {
  return Math.max(0, Math.round((calendarDay(date, timeZone) - calendarDay(now, timeZone)) / DAY));
}

function calendarDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric", timeZone: validTimeZone(timeZone) }).formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

export function renewsText(days: number): string {
  if (days === 0) return "Renews today";
  if (days === 1) return "Renews tomorrow";
  return `Renews in ${days} days`;
}
