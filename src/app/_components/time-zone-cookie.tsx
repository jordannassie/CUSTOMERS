"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

// Tells the server the browser's time zone, so dates it writes into sentences (banners, plan changes) match the
// dates the page formats itself (BUG-111). Not personal data: a zone name such as "America/Los_Angeles".
export function TimeZoneCookie() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || document.cookie.split("; ").includes(`${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}`)) return;
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
