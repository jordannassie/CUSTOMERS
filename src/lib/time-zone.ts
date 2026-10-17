// The viewer's time zone for dates the server writes into sentences (BUG-111): the browser stores it in a cookie,
// and anything missing or unknown is UTC. Pure, shared by the server reader and the browser.

export const TIME_ZONE_COOKIE = "tz";

export function validTimeZone(zone: string | null | undefined): string {
  if (!zone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

/** "October 13, 2026": a customer-facing trial or billing date. */
export const LONG_DATE: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

/**
 * The one way a trial or billing date is written for a customer (BUG-070): in the viewer's own time zone, so the
 * card step, the trial banner, Billing and the plan-change dialogs always name the same day. UTC when unknown.
 */
export function customerDate(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions = LONG_DATE): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: validTimeZone(timeZone) }).format(date);
}

/** A date written where the reader's zone is unknown (emails, admin): UTC, and it says so. */
export function utcDate(date: Date, options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }): string {
  return `${new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date)} (UTC)`;
}
