"use client";

import { useSyncExternalStore } from "react";
import { customerDate, LONG_DATE } from "@/lib/time-zone";

// One date, in the viewer's own time zone. The server and the first render use UTC, then the browser's zone, so
// there is no hydration mismatch. Before this, the card step said the trial ends October 16 (the browser's zone)
// and Billing said October 15 (UTC), and the share report used UTC.

const noChange = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useTimeZone(): string {
  return useSyncExternalStore(noChange, browserZone, () => "UTC");
}

export function LocalDate({ iso, options = LONG_DATE }: { iso: string; options?: Intl.DateTimeFormatOptions }) {
  const timeZone = useTimeZone();
  return <time dateTime={iso}>{customerDate(new Date(iso), timeZone, options)}</time>;
}
