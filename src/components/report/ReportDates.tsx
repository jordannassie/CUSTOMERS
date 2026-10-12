"use client";

import { useTimeZone } from "@/components/ui/local-date";
import { reportDay, reportPeriod } from "@/lib/report-dates";

/** "Prepared Oct 8, 2026" in the viewer's time zone (UTC on the server and in the first render). */
export function PreparedOn({ iso }: { iso: string }) {
  const timeZone = useTimeZone();
  return <time dateTime={iso}>{reportDay(new Date(iso), true, timeZone)}</time>;
}

/** "Sep 9 to Oct 8, 2026" in the viewer's time zone. */
export function ReportPeriod({ iso, windowDays }: { iso: string; windowDays: number }) {
  const timeZone = useTimeZone();
  return <>{reportPeriod(new Date(iso), windowDays, timeZone)}</>;
}
