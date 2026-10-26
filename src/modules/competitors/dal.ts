import "server-only";
import { providerErrorKind } from "@/lib/provider-error-kind";
import { cache } from "react";
import { env } from "@/lib/env";
import { requestNow } from "@/lib/request-now";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { maxCompetitors } from "@/modules/entitlements";
import { limitMessage, placeIdForName } from "@/modules/onboarding/server";
import { loadAlsoRecommended, loadScoreReport, recountAfterNamesChange } from "@/modules/scanning";
import { fixtureSignals } from "./place-fixtures";
import { createPlaceSignals, PlacesUnavailable, type FetchSignals } from "./places";
import { pickedInstead, type PickedInstead } from "./picked";
import { competitorChartsView } from "./charts";
import { competitorsView, signalRows, type CompetitorsView, type SignalResult, type SignalRow } from "./service";
import { loadWhyPanels } from "./why/dal";
import { whyCard, type WhyPanel } from "./why/service";

// Fixture mode is refused in production so a stray flag can never show made-up businesses to users.
function liveSignals(): FetchSignals {
  if (env.PLACES_FIXTURES === "true" && env.NODE_ENV !== "production") return fixtureSignals;
  if (env.GOOGLE_PLACES_API_KEY) return createPlaceSignals(env.GOOGLE_PLACES_API_KEY);
  return async () => {
    throw new PlacesUnavailable("GOOGLE_PLACES_API_KEY is not set");
  };
}

// React's cache lives for one server request only, which is all Google allows us to keep (D-73).
const signalsForRequest = cache(async (placeId: string) => {
  try {
    return await liveSignals()(placeId);
  } catch (err) {
    // Feeds the provider error spike alert (MVP_SPEC 22); a missing key is a setup gap, not a Google outage.
    if (env.GOOGLE_PLACES_API_KEY) await recordPlacesError(err);
    throw err;
  }
});

async function recordPlacesError(err: unknown): Promise<void> {
  const message = `Live lookup failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500);
  // One row per kind of failure an hour, with a count (migration 058): a used-up quota no longer writes one per visit.
  const { error } = await createServiceClient().rpc("record_provider_error", { p_provider: "google_places", p_kind: providerErrorKind(message), p_message: message });
  if (error) console.error(`Could not record the Places error: ${error.message}`);
}

/** The first saved answer checked for a competitor: since it was added, or earlier once saved answers were checked again. */
function countedFrom(r: { created_at: string; checked_from: string | null }): Date {
  const added = new Date(r.created_at);
  return r.checked_from && Date.parse(r.checked_from) < added.getTime() ? new Date(r.checked_from) : added;
}

/** Live Google signals for one place id; kept in memory for the request only (D-73). */
export const fetchPlaceSignals: FetchSignals = (placeId) => signalsForRequest(placeId);

/**
 * The Competitors page for one of the signed-in agency's businesses; null when it is not theirs. The Google table
 * comes apart, as a promise: its live Places lookups (one per business) no longer hold up the rest of the page.
 */
export async function getCompetitorsPage(
  businessId: string,
  next: string,
): Promise<{ view: CompetitorsView; signals: Promise<SignalRow[]>; why: WhyPanel[] } | null> {
  const { agency } = await requireAgency({ next });
  const now = requestNow();
  const base = await loadCompetitorsBase(agency.id, businessId, now, { charts: true });
  if (!base) return null;
  // "See why" reads only saved answers (already read for this request) and fixes; a chain row's panel uses its name.
  const why = await loadWhyPanels(agency.id, businessId, now, chainNames(base.view.leaderboard));
  return { view: base.view, signals: base.signals(signalsForRequest), why };
}

// Callers check the user may see this agency first. Reads only; nothing from Places is written (D-73). The shared
// report and its PDF wait for the Google table too, so the printed page is complete.
export async function loadCompetitorsPage(
  agencyId: string,
  businessId: string,
  now: Date,
  fetchSignals: FetchSignals,
): Promise<CompetitorsView | null> {
  const base = await loadCompetitorsBase(agencyId, businessId, now);
  return base && { ...base.view, signals: await base.signals(fetchSignals) };
}

async function loadCompetitorsBase(
  agencyId: string,
  businessId: string,
  now: Date,
  { charts = false }: { charts?: boolean } = {},
): Promise<{ view: CompetitorsView; signals: (fetchSignals: FetchSignals) => Promise<SignalRow[]> } | null> {
  const db = createServiceClient();
  const [report, also, business, rows, limit] = await Promise.all([
    loadScoreReport(agencyId, businessId, now, { charts }),
    loadAlsoRecommended(agencyId, businessId, now),
    db.from("businesses").select("name, places_id, is_chain").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db
      .from("business_competitors")
      .select("id, name, domain, places_id, place_id, created_at, checked_from")
      .eq("business_id", businessId)
      .order("created_at"),
    maxCompetitors(businessId),
  ]);
  for (const r of [business, rows]) if (r.error) throw new Error(`Competitors: ${r.error.message}`);
  if (!report || !also || !business.data) return null;

  // place_id is where older code kept the id (B-35 moves it on the next save).
  const competitors = rows.data!.map((r) => ({
    id: r.id,
    name: r.name,
    // Only ever a website the user typed (D-73): Google's is shown live, never saved.
    domain: r.domain,
    placesId: r.places_id ?? r.place_id,
    countedFrom: countedFrom(r),
  }));
  const you = { name: business.data.name, placesId: business.data.places_id, chain: business.data.is_chain };
  const view = competitorsView({ business: you, report, competitors, signals: new Map(), also, limit: limit.limit });
  if (charts) {
    // The leaderboard's rule: a competitor added after the last scan was never looked for, so it has no score yet.
    const last = report.lastCheckedAt?.getTime() ?? null;
    const scored = new Set(competitors.filter((c) => last !== null && c.countedFrom.getTime() <= last).map((c) => c.name));
    view.charts = competitorChartsView(report, scored);
  }

  const signals = async (fetchSignals: FetchSignals): Promise<SignalRow[]> => {
    const placeIds = [...new Set([you.placesId, ...competitors.map((c) => c.placesId)].filter((id) => id !== null))];
    const results = await Promise.all(
      placeIds.map(async (id): Promise<[string, SignalResult]> => [
        id,
        await fetchSignals(id).catch((e) => (e instanceof PlacesUnavailable && e.limited ? ("limited" as const) : ("error" as const))),
      ]),
    );
    return signalRows(you, competitors, new Map(results));
  };
  return { view, signals };
}

export type TrackResult = { ok: true } | { ok: false; status: 403 | 404; error: string };

/**
 * "Track" on an AI-named business: the name as AI wrote it, plus its Google listing's place id when a lookup near the
 * business finds it clearly, so its rating and reviews show instead of "Not matched to a Google listing" (step 9c).
 * Only the place id is stored (D-73).
 */
export async function trackCompetitorByName(userId: string, businessId: string, name: string): Promise<TrackResult> {
  // Reads go through the user's session (RLS); the one write uses the service role after the ownership check (SEC-10).
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return { ok: false, status: 404, error: "Business not found." };

  const [existing, { limit }] = await Promise.all([
    supabase.from("business_competitors").select("name").eq("business_id", businessId),
    maxCompetitors(businessId),
  ]);
  if (existing.error) throw new Error(`Could not load competitors: ${existing.error.message}`);
  if (existing.data.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())) return { ok: true };
  if (limit !== null && existing.data.length >= limit) {
    return { ok: false, status: 403, error: `${limitMessage(limit)} Remove one to track another.` };
  }

  const placesId = await placeIdForName(userId, businessId, name).catch(() => null);
  const { error: insertError } = await createServiceClient()
    .from("business_competitors")
    .insert({ business_id: businessId, name, places_id: placesId, source: "manual", confirmed: true });
  // 23505: the same name was added a moment ago, in another tab or by a double click.
  if (insertError && insertError.code !== "23505") throw new Error(`Could not add the competitor: ${insertError.message}`);
  // Saved answers are checked for it at once, so it is compared over the whole window (BUG-122).
  if (!insertError) await recountAfterNamesChange(businessId);
  return { ok: true };
}

/**
 * The Overview's "Who AI picked instead" (DB-004): the leaderboard, plus the business AI named most when you don't
 * track it (step 6a). No Google calls (D-73). Null when the business is not the agency's.
 */
export async function getPickedInstead(businessId: string): Promise<PickedInstead | null | "none-tracked"> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  return loadPicked(agency.id, businessId, requestNow());
}

/**
 * The same without a signed-in user, for the shared report and the weekly email: callers check the agency first.
 * Reads saved answers and fixes only; no Google call (D-73).
 */
export async function loadPicked(agencyId: string, businessId: string, now: Date): Promise<PickedInstead | null | "none-tracked"> {
  const db = createServiceClient();
  const [report, also, business, rows] = await Promise.all([
    loadScoreReport(agencyId, businessId, now),
    loadAlsoRecommended(agencyId, businessId, now),
    db.from("businesses").select("name, places_id").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("business_competitors").select("name, places_id, place_id, created_at, checked_from").eq("business_id", businessId).order("created_at"),
  ]);
  for (const r of [business, rows]) if (r.error) throw new Error(`Competitors: ${r.error.message}`);
  if (!report || !also || !business.data) return null;
  if (rows.data!.length === 0) return "none-tracked";
  const view = competitorsView({
    business: { name: business.data.name, placesId: business.data.places_id },
    report,
    competitors: rows.data!.map((r) => ({ name: r.name, placesId: r.places_id ?? r.place_id, countedFrom: countedFrom(r) })),
    signals: new Map(),
    also,
    limit: null,
  });
  const picked = pickedInstead(view);
  if (!picked) return picked;
  const panels = await loadWhyPanels(agencyId, businessId, now, chainNames(view.leaderboard));
  return { ...picked, why: whyCard(view.leaderboard, panels) };
}

/** Each tracked name on a chain row, to the chain AI named ("Bennu Coffee on Congress" to "Bennu Coffee"). */
function chainNames(rows: CompetitorsView["leaderboard"]): Map<string, string> {
  return new Map(rows.flatMap((r) => (r.chain ? r.chain.tracked.map((t) => [t, r.chain!.brand] as const) : [])));
}
