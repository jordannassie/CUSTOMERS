import "server-only";
import { cookies } from "next/headers";
import { TIME_ZONE_COOKIE, validTimeZone } from "./time-zone";

/** The signed-in viewer's time zone from the browser's cookie; UTC until the browser has set it, or outside a request. */
export async function viewerTimeZone(): Promise<string> {
  try {
    return validTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value);
  } catch {
    return "UTC";
  }
}
