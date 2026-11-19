import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { devFlag } from "@/lib/dev-flag";
import { providerErrorKind } from "@/lib/provider-error-kind";
import { createServiceClient } from "@/lib/supabase/service";
import { meteredFetch } from "@/modules/service-costs";
import { PLACES_LIMITED } from "@/modules/system-status";
import { fixtureSignals } from "../place-fixtures";
import { createPlaceSignals, PlacesUnavailable, type FetchSignals } from "../places";

// Live Google Places lookups for the Competitors, Compare and Actions pages, kept in memory for one request only
// (D-73), and what a failed one records: the provider error count and, for a refused quota, the admin bell's alert.

// Fixture mode is refused in production so a stray flag can never show made-up businesses to users.
function liveSignals(): FetchSignals {
  if (devFlag("PLACES_FIXTURES")) return fixtureSignals;
  // Each answered lookup is recorded with what it cost, for the admin Usage and cost page (2026-11-17).
  if (env.GOOGLE_PLACES_API_KEY) return createPlaceSignals(env.GOOGLE_PLACES_API_KEY, meteredFetch());
  return async () => {
    throw new PlacesUnavailable("GOOGLE_PLACES_API_KEY is not set");
  };
}

// React's cache lives for one server request only, which is all Google allows us to keep (D-73).
export const signalsForRequest = cache(async (placeId: string) => {
  try {
    return await liveSignals()(placeId);
  } catch (err) {
    // Feeds the provider error spike alert (MVP_SPEC 22); a missing key is a setup gap, not a Google outage.
    // A paused lookup asked nothing; the refusal that started the pause was recorded already.
    if (env.GOOGLE_PLACES_API_KEY && !(err instanceof PlacesUnavailable && err.paused)) await recordPlacesError(err);
    throw err;
  }
});

async function recordPlacesError(err: unknown): Promise<void> {
  const message = `Live lookup failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500);
  const db = createServiceClient();
  // One row per kind of failure an hour, with a count (migration 058): a used-up quota no longer writes one per visit.
  const { error } = await db.rpc("record_provider_error", { p_provider: "google_places", p_kind: providerErrorKind(message), p_message: message });
  if (error) console.error(`Could not record the Places error: ${error.message}`);
  // Google refused a customer's lookup for its limit: the admin bell says so at once, in the System status check's own
  // alert, so the next check that finds Places working closes it (owner, 2026-11-17). One open alert at most per kind.
  if (err instanceof PlacesUnavailable && err.limited) {
    const raised = await db.rpc("raise_system_alert", {
      p_kind: PLACES_ALERT_KIND,
      p_severity: "warning",
      p_message: `Google Places is not working. ${PLACES_LIMITED.detail} Found when a customer opened Google details. ${PLACES_LIMITED.fix}`,
      p_details: { service: "google_places", source: "live_lookup" },
    });
    if (raised.error) console.error(`Could not raise the Places quota alert: ${raised.error.message}`);
  }
}

/** The System status check's alert kind for Google Places (admin alerts serviceCheckKind). */
const PLACES_ALERT_KIND = "service_check:google_places";

/** Live Google signals for one place id; kept in memory for the request only (D-73). */
export const fetchPlaceSignals: FetchSignals = (placeId) => signalsForRequest(placeId);
