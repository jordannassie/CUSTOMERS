// The share report's dates (B-59), in a given time zone: the viewer's own once the page is in the browser, so a
// report opened in Las Vegas in the evening is not dated tomorrow (UTC). Pure, shared by the report and its tests.

const DAY_MS = 86_400_000;

export function reportDay(date: Date, withYear: boolean, timeZone = "UTC"): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", ...(withYear && { year: "numeric" }), timeZone });
}

/** "Aug 31 to Sep 29, 2026": the 30 days the score covers, ending on `now`. */
export function reportPeriod(now: Date, windowDays: number, timeZone = "UTC"): string {
  const from = new Date(now.getTime() - (windowDays - 1) * DAY_MS);
  const year = (d: Date) => new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(d);
  return `${reportDay(from, year(from) !== year(now), timeZone)} to ${reportDay(now, true, timeZone)}`;
}
