// The business location sent with each check. Providers reject empty fields ("user_location.region: String should
// have at least 1 character"), so unknown parts are left out instead of sent as "" (BUG-073).
import type { CheckLocation } from "./types";

export function knownLocation(location: CheckLocation): Partial<CheckLocation> {
  const known: Partial<CheckLocation> = {};
  for (const key of ["city", "region", "country"] as const) {
    const value = location[key].trim();
    if (value) known[key] = value;
  }
  return known;
}
