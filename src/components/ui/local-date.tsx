"use client";

import { useSyncExternalStore } from "react";

// One date, in the viewer's own time zone. The server and the first render use UTC, then the browser's zone, so
// there is no hydration mismatch. Before this, the card step said the trial ends October 16 (the browser's zone)
// and Billing said October 15 (UTC), and the share report used UTC.

const LONG: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
const noChange = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useTimeZone(): string {
  return useSyncExternalStore(noChange, browserZone, () => "UTC");
}

export function LocalDate({ iso, options = LONG }: { iso: string; options?: Intl.DateTimeFormatOptions }) {
  const timeZone = useTimeZone();
  return <time dateTime={iso}>{new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(new Date(iso))}</time>;
}
