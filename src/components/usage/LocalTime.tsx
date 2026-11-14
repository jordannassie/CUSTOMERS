"use client";

import { useSyncExternalStore } from "react";
import { dayAndTime } from "./format";

const noop = () => () => {};

// The server has no idea of the viewer's time zone, so it renders UTC (labelled) and the browser swaps in local time.
export function LocalDayAndTime({ iso }: { iso: string }) {
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  const zone = inBrowser ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return <time dateTime={iso}>{dayAndTime(iso, zone)}</time>;
}
