import "server-only";
import { cachedPlaceId, placeIdKey, rememberPlaceId } from "../place-id-cache";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maxCompetitors } from "@/modules/entitlements";
import { recountAfterNamesChange } from "@/modules/scanning";
import { fixturePlaces } from "../competitor-fixtures";
import { createCompetitorPlaces, type CompetitorCandidate, type CompetitorPlaces } from "../competitor-places";
import {
  CLEARED_PLACES_COLUMNS,
  COMPETITOR_NOTES,
  MAX_LOOKUP_RESULTS,
  competitorFields,
  competitorInsertRow,
  discoverCompetitors,
  limitMessage,
  lookupQuery,
  matchingPlace,
  mergeAliases,
  originOf,
  planSave,
  type BusinessForSearch,
  type ConfirmedCompetitor,
} from "../competitors";
import { clearLocationNotes, loadLocationNotes } from "../competitor-location/notes/dal";
import { PlacesError } from "../places";
import { forDisplay, withDistance } from "../branches";

// The competitors step (MVP_SPEC 3.1 step 5): suggestions near the business, lookups by name and the saved list.
// Split from onboarding/dal.ts, which re-exports it.

export function liveCompetitorPlaces(): CompetitorPlaces {
  if (env.PLACES_FIXTURES === "true" && env.NODE_ENV !== "production") return fixturePlaces;
  if (env.GOOGLE_PLACES_API_KEY) return createCompetitorPlaces(env.GOOGLE_PLACES_API_KEY);
  return {
    search: async () => {
      throw new PlacesError("GOOGLE_PLACES_API_KEY is not set");
    },
    details: async () => null,
  };
}

async function ownBusinessForSearch(userId: string, businessId: string): Promise<BusinessForSearch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("name, industry, services, primary_city, primary_region, primary_country, places_id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!data) return null;
  return {
    name: data.name,
    industry: data.industry,
    services: data.services,
    city: data.primary_city,
    region: data.primary_region,
    placesId: data.places_id,
    country: data.primary_country,
  };
}

async function competitorLimit(businessId: string): Promise<number | null> {
  return (await maxCompetitors(businessId)).limit;
}

/** A saved competitor: the user's name and place id from the database, Places values fetched live. */
export type SavedCompetitor = {
  name: string;
  placesId: string | null;
  live: CompetitorCandidate | null;
  /** "Added by name: check it is near Dallas" when it was typed before the business moved. */
  checkNear?: string | null;
};

export type CompetitorStep = {
  businessName: string;
  /** Null when the plan sets no limit. */
  limit: number | null;
  saved: SavedCompetitor[];
  suggestions: CompetitorCandidate[];
  note: string | null;
  /** "We removed 2 competitors from Austin.", shown until the list is saved again. */
  locationNote: string | null;
};

/** Everything the competitor step shows. Null when the business is not the user's. */
export async function loadCompetitorStep(
  userId: string,
  businessId: string,
  places: CompetitorPlaces = liveCompetitorPlaces(),
): Promise<CompetitorStep | null> {
  const supabase = await createClient();
  // Read at once (2026-10-29): the competitors are the signed-in user's own rows only, and are dropped unless the
  // business is theirs.
  const [business, { data: rows, error }] = await Promise.all([
    ownBusinessForSearch(userId, businessId),
    supabase.from("business_competitors").select("name, places_id, place_id, created_at").eq("business_id", businessId).order("created_at"),
  ]);
  if (!business) return null;
  if (error) throw new Error(`Could not load competitors: ${error.message}`);

  const [found, saved, limit, notes] = await Promise.all([
    discoverCompetitors(business, places),
    Promise.all(
      rows.map(async (row): Promise<SavedCompetitor & { createdAt: string }> => {
        // place_id is where older code kept the id; it moves to places_id on the next save.
        const placesId = row.places_id ?? row.place_id;
        // Location and website help pick a branch; they never go to the browser (D-88).
        const found = placesId ? await places.details(placesId).catch(() => null) : null;
        const live = found ? forDisplay([found])[0] : null;
        return { name: row.name, placesId, live, createdAt: row.created_at };
      }),
    ),
    competitorLimit(businessId),
    loadLocationNotes(businessId),
  ]);
  return {
    businessName: business.name,
    limit,
    saved: saved.map(({ createdAt, ...c }) => {
      const checkNear = notes.forCompetitor({ placesId: c.placesId, createdAt });
      return checkNear ? { ...c, checkNear } : c;
    }),
    ...found,
    locationNote: notes.removed,
  };
}

/** "Add by name" with a Places lookup near the business. Null when the business is not the user's. */
export async function lookupCompetitor(
  userId: string,
  businessId: string,
  name: string,
  places: CompetitorPlaces = liveCompetitorPlaces(),
): Promise<{ matches: CompetitorCandidate[]; note: string | null; country?: string | null } | null> {
  const business = await ownBusinessForSearch(userId, businessId);
  if (!business) return null;
  try {
    // Every branch near the business is looked at, then only the nearest of each chain is offered (branches.ts).
    const origin = await originOf(business, places);
    const found = withDistance(await places.search(lookupQuery(name, business), MAX_LOOKUP_RESULTS, origin), origin);
    return { matches: found, note: null, country: business.country ?? null };
  } catch {
    return { matches: [], note: COMPETITOR_NOTES.unavailable };
  }
}

export type SaveCompetitorsResult = { ok: true; count: number } | { ok: false; status: 403 | 404 | 409; error: string };

/**
 * Replaces the business's competitor list with the user's confirmed one. Writes only the name the
 * user confirmed and the place id; Places ratings, reviews and addresses are never stored (D-73).
 */
export async function saveCompetitors(
  userId: string,
  businessId: string,
  list: ConfirmedCompetitor[],
): Promise<SaveCompetitorsResult> {
  if (!(await ownBusinessForSearch(userId, businessId))) return { ok: false, status: 404, error: "Business not found." };
  const limit = await competitorLimit(businessId);
  if (limit !== null && list.length > limit) return { ok: false, status: 403, error: limitMessage(limit) };

  // Two saves at once (a double click, a second tab) both add the same name; the unique name index refuses the later
  // one. Planned again from what is saved now, that save only keeps rows, so both end with the same list.
  let saved = await writeCompetitors(businessId, list);
  const retried = saved === "conflict";
  if (retried) saved = await writeCompetitors(businessId, list);
  if (saved === "conflict") return { ok: false, status: 409, error: "That list changed in another tab. Reload and try again." };
  // Saved answers are checked for the new list, so a new competitor is not "still collecting" (BUG-122).
  if (retried || saved.changed) await recountAfterNamesChange(businessId);
  // The list was confirmed for where the business is now: the "removed" note and "check it is near" lines go.
  await clearLocationNotes(businessId);
  return { ok: true, count: list.length };
}

async function writeCompetitors(businessId: string, list: ConfirmedCompetitor[]): Promise<{ changed: boolean } | "conflict"> {
  // The business was checked as the user's by the caller; users can't write competitors themselves (migration 047, SEC-10).
  const supabase = await createClient();
  const existing = await supabase.from("business_competitors").select("id, name, aliases").eq("business_id", businessId);
  if (existing.error) throw new Error(`Could not load competitors: ${existing.error.message}`);
  const plan = planSave(existing.data, list);

  if (plan.remove.length) {
    const { error } = await createServiceClient().from("business_competitors").delete().in("id", plan.remove).eq("business_id", businessId);
    if (error) throw new Error(`Could not remove competitors: ${error.message}`);
  }
  for (const { id, competitor } of plan.keep) {
    const { error } = await createServiceClient()
      .from("business_competitors")
      .update({ ...competitorFields(competitor), ...keptAliases(existing.data, id, competitor), ...CLEARED_PLACES_COLUMNS })
      .eq("id", id).eq("business_id", businessId);
    if (error) throw new Error(`Could not update a competitor: ${error.message}`);
  }
  if (plan.add.length) {
    const { error } = await createServiceClient().from("business_competitors").insert(plan.add.map((c) => competitorInsertRow(businessId, c)));
    if (error?.code === "23505") return "conflict";
    if (error) throw new Error(`Could not add competitors: ${error.message}`);
  }
  return { changed: plan.add.length > 0 || plan.remove.length > 0 || plan.keep.some((k) => k.competitor.aliases?.length) };
}

/** A kept competitor keeps its other names; a new one from this save (the long Google name) is added to them. */
function keptAliases(rows: { id: string; aliases: string[] }[], id: string, competitor: ConfirmedCompetitor) {
  if (!competitor.aliases?.length) return {};
  return { aliases: mergeAliases(rows.find((r) => r.id === id)?.aliases ?? [], competitor.aliases, competitor.name) };
}

/** The place id of the Google listing for a name AI suggested, or null when none clearly matches or Places fails. */
export async function placeIdForName(userId: string, businessId: string, name: string, places?: CompetitorPlaces): Promise<string | null> {
  // The same name near the same business matched a day ago: no new search (only the place ID is kept, D-73).
  const key = placeIdKey(businessId, name);
  const known = cachedPlaceId(key);
  if (known !== undefined) return known;
  const found = await lookupCompetitor(userId, businessId, name, places);
  if (!found) return null;
  const placeId = matchingPlace(name, found.matches)?.placeId ?? null;
  // A failed search is not remembered: the next one tries Google again.
  if (found.note !== COMPETITOR_NOTES.unavailable) rememberPlaceId(key, placeId);
  return placeId;
}
