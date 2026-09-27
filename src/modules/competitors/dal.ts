import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { maxCompetitors } from "@/modules/entitlements";
import { limitMessage } from "@/modules/onboarding/server";
import { loadAlsoRecommended, loadScoreReport } from "@/modules/scanning";
import { fixtureSignals } from "./place-fixtures";
import { createPlaceSignals, PlacesUnavailable, type FetchSignals } from "./places";
import { competitorsView, type CompetitorsView, type SignalResult } from "./service";

// Fixture mode is refused in production so a stray flag can never show made-up businesses to users.
function liveSignals(): FetchSignals {
  if (env.PLACES_FIXTURES === "true" && env.NODE_ENV !== "production") return fixtureSignals;
  if (env.GOOGLE_PLACES_API_KEY) return createPlaceSignals(env.GOOGLE_PLACES_API_KEY);
  return async () => {
    throw new PlacesUnavailable("GOOGLE_PLACES_API_KEY is not set");
  };
}

// React's cache lives for one server request only, which is all Google allows us to keep (D-73).
const signalsForRequest = cache((placeId: string) => liveSignals()(placeId));

/** Live Google signals for one place id; kept in memory for the request only (D-73). */
export const fetchPlaceSignals: FetchSignals = (placeId) => signalsForRequest(placeId);

/** The Competitors page for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getCompetitorsPage(businessId: string, next: string): Promise<CompetitorsView | null> {
  const { agency } = await requireAgency({ next });
  return loadCompetitorsPage(agency.id, businessId, new Date(), signalsForRequest);
}

// Callers check the user may see this agency first. Reads only; nothing from Places is written (D-73).
export async function loadCompetitorsPage(
  agencyId: string,
  businessId: string,
  now: Date,
  fetchSignals: FetchSignals,
): Promise<CompetitorsView | null> {
  const db = createServiceClient();
  const [report, also, business, rows, limit] = await Promise.all([
    loadScoreReport(agencyId, businessId, now),
    loadAlsoRecommended(agencyId, businessId, now),
    db.from("businesses").select("name, places_id").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db
      .from("business_competitors")
      .select("name, places_id, place_id, created_at")
      .eq("business_id", businessId)
      .order("created_at"),
    maxCompetitors(businessId),
  ]);
  for (const r of [business, rows]) if (r.error) throw new Error(`Competitors: ${r.error.message}`);
  if (!report || !also || !business.data) return null;

  // place_id is where older code kept the id (B-35 moves it on the next save).
  const competitors = rows.data!.map((r) => ({
    name: r.name,
    placesId: r.places_id ?? r.place_id,
    createdAt: new Date(r.created_at),
  }));
  const placeIds = [...new Set([business.data.places_id, ...competitors.map((c) => c.placesId)].filter((id) => id !== null))];
  const results = await Promise.all(
    placeIds.map(async (id): Promise<[string, SignalResult]> => [id, await fetchSignals(id).catch(() => "error" as const)]),
  );

  return competitorsView({
    business: { name: business.data.name, placesId: business.data.places_id },
    report,
    competitors,
    signals: new Map(results),
    also,
    limit: limit.limit,
  });
}

export type TrackResult = { ok: true } | { ok: false; status: 403 | 404; error: string };

/** "Track" on an AI-named business: the name only, as if typed by the user (no place id, D-73). */
export async function trackCompetitorByName(userId: string, businessId: string, name: string): Promise<TrackResult> {
  // RLS (business_competitors_owner_all) limits these reads and writes to the owner's own business.
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return { ok: false, status: 404, error: "Business not found." };

  const existing = await supabase.from("business_competitors").select("name").eq("business_id", businessId);
  if (existing.error) throw new Error(`Could not load competitors: ${existing.error.message}`);
  if (existing.data.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())) return { ok: true };
  const { limit } = await maxCompetitors(businessId);
  if (limit !== null && existing.data.length >= limit) {
    return { ok: false, status: 403, error: `${limitMessage(limit)} Remove one to track another.` };
  }

  const { error: insertError } = await supabase
    .from("business_competitors")
    .insert({ business_id: businessId, name, places_id: null, source: "manual", confirmed: true });
  // 23505: the same name was added a moment ago, in another tab or by a double click.
  if (insertError && insertError.code !== "23505") throw new Error(`Could not add the competitor: ${insertError.message}`);
  return { ok: true };
}
