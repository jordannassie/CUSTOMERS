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
