import "server-only";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maxCompetitors } from "@/modules/entitlements";
import { INTENTS, type Intent } from "@/modules/question-library";
import type { Json } from "@/types/database.types";
import { autofill, type AutofillClients, type AutofillRequest } from "./autofill";
import { createBusinessExtractor, ExtractError } from "./extract";
import { createFirecrawlScraper } from "./firecrawl";
import { fixturePlaces } from "./competitor-fixtures";
import { createCompetitorPlaces, type CompetitorCandidate, type CompetitorPlaces } from "./competitor-places";
import {
  CLEARED_PLACES_COLUMNS,
  COMPETITOR_NOTES,
  MAX_LOOKUP_RESULTS,
  competitorFields,
  discoverCompetitors,
  limitMessage,
  lookupQuery,
  planSave,
  type BusinessForSearch,
  type ConfirmedCompetitor,
} from "./competitors";
import { createPlacesSearch, PlacesError } from "./places";
import { createQuestionModel } from "./question-model";
import type { LibraryEntry } from "./question-rules";
import type { QuestionClients } from "./questions";
import type { AutofillResult } from "./schema";

// A missing key turns that source off; auto-fill then works with whatever is left.
export function liveAutofillClients(): AutofillClients {
  return {
    scrape: env.FIRECRAWL_API_KEY ? createFirecrawlScraper(env.FIRECRAWL_API_KEY) : async () => [],
    searchPlaces: env.GOOGLE_PLACES_API_KEY ? createPlacesSearch(env.GOOGLE_PLACES_API_KEY) : async () => [],
    extract: env.ANTHROPIC_API_KEY
      ? createBusinessExtractor(env.ANTHROPIC_API_KEY)
      : async () => {
          throw new ExtractError("ANTHROPIC_API_KEY is not set", false);
        },
  };
}

/** Active templates of the newest library version for one industry (question_library is service role only). */
export async function loadQuestionLibrary(industry: string): Promise<LibraryEntry[]> {
  const { data, error } = await createServiceClient()
    .from("question_library")
    .select("id, template, tags, intent, version")
    .eq("industry", industry)
    .eq("active", true)
    .order("version", { ascending: false });
  if (error) throw new Error(`Could not load the question library: ${error.message}`);
  const newest = data[0]?.version;
  return data
    .filter((row) => row.version === newest && INTENTS.includes(row.intent as Intent))
    .map((row) => ({ id: row.id, template: row.template, tags: row.tags, intent: row.intent as Intent }));
}

// Without a key every model call fails, so the template engine fallback runs (MVP_SPEC 5.3).
export function liveQuestionClients(): QuestionClients {
  const missing = async (): Promise<never> => {
    throw new Error("ANTHROPIC_API_KEY is not set");
  };
  return {
    loadLibrary: loadQuestionLibrary,
    model: env.ANTHROPIC_API_KEY ? createQuestionModel(env.ANTHROPIC_API_KEY) : { pick: missing, write: missing },
  };
}

/**
 * Runs auto-fill for one of the user's businesses. Returns null when the business is not theirs.
 * Stores only place_id from Places and the site's own facts (D-73); the form values go back to
 * the screen and are saved only when the user confirms them (B-36).
 */
export async function runBusinessAutofill(
  userId: string,
  businessId: string,
  request: AutofillRequest,
  clients: AutofillClients = liveAutofillClients(),
): Promise<AutofillResult | null> {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return null;

  const run = await autofill(request, clients);

  // business_site_facts has no write policy for signed-in users, so writes use the service role
  // after the ownership check above.
  const service = createServiceClient();
  if (run.placeId) {
    const { error: placeError } = await service.from("businesses").update({ places_id: run.placeId }).eq("id", businessId);
    if (placeError) throw new Error(`Could not save place_id: ${placeError.message}`);
  }
  if (run.siteFacts) {
    const { error: factsError } = await service
      .from("business_site_facts")
      .upsert({ business_id: businessId, data: run.siteFacts as unknown as Json, fetched_at: new Date().toISOString() });
    if (factsError) throw new Error(`Could not save site facts: ${factsError.message}`);
  }
  return run.result;
}

// Fixture mode is refused in production so a stray flag can never show made-up competitors to users.
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
    .select("name, industry, services, primary_city, primary_region, places_id")
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
  };
}

async function competitorLimit(businessId: string): Promise<number | null> {
  return (await maxCompetitors(businessId)).limit;
}

/** A saved competitor: the user's name and place id from the database, Places values fetched live. */
export type SavedCompetitor = { name: string; placesId: string | null; live: CompetitorCandidate | null };

export type CompetitorStep = {
  businessName: string;
  /** Null when the plan sets no limit. */
  limit: number | null;
  saved: SavedCompetitor[];
  suggestions: CompetitorCandidate[];
  note: string | null;
};

/** Everything the competitor step shows. Null when the business is not the user's. */
export async function loadCompetitorStep(
  userId: string,
  businessId: string,
  places: CompetitorPlaces = liveCompetitorPlaces(),
): Promise<CompetitorStep | null> {
  const business = await ownBusinessForSearch(userId, businessId);
  if (!business) return null;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("business_competitors")
    .select("name, places_id, place_id")
    .eq("business_id", businessId)
    .order("created_at");
  if (error) throw new Error(`Could not load competitors: ${error.message}`);

  const [found, saved, limit] = await Promise.all([
    discoverCompetitors(business, places),
    Promise.all(
      rows.map(async (row): Promise<SavedCompetitor> => {
        // place_id is where older code kept the id; it moves to places_id on the next save.
        const placesId = row.places_id ?? row.place_id;
        const live = placesId ? await places.details(placesId).catch(() => null) : null;
        return { name: row.name, placesId, live };
      }),
    ),
    competitorLimit(businessId),
  ]);
  return { businessName: business.name, limit, saved, ...found };
}

/** "Add by name" with a Places lookup near the business. Null when the business is not the user's. */
export async function lookupCompetitor(
  userId: string,
  businessId: string,
  name: string,
  places: CompetitorPlaces = liveCompetitorPlaces(),
): Promise<{ matches: CompetitorCandidate[]; note: string | null } | null> {
  const business = await ownBusinessForSearch(userId, businessId);
  if (!business) return null;
  try {
    const matches = await places.search(lookupQuery(name, business), MAX_LOOKUP_RESULTS);
    return { matches, note: null };
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

  // RLS (business_competitors_owner_all) limits these writes to the owner's own business.
  const supabase = await createClient();
  const existing = await supabase.from("business_competitors").select("id, name").eq("business_id", businessId);
  if (existing.error) throw new Error(`Could not load competitors: ${existing.error.message}`);
  const plan = planSave(existing.data, list);

  if (plan.remove.length) {
    const { error } = await supabase.from("business_competitors").delete().in("id", plan.remove);
    if (error) throw new Error(`Could not remove competitors: ${error.message}`);
  }
  for (const { id, competitor } of plan.keep) {
    const { error } = await supabase
      .from("business_competitors")
      .update({ ...competitorFields(competitor), ...CLEARED_PLACES_COLUMNS })
      .eq("id", id);
    if (error) throw new Error(`Could not update a competitor: ${error.message}`);
  }
  if (plan.add.length) {
    const { error } = await supabase.from("business_competitors").insert(plan.add.map((c) => ({ business_id: businessId, ...competitorFields(c) })));
    if (error) {
      if (error.code === "23505") return { ok: false, status: 409, error: "That list changed in another tab. Reload and try again." };
      throw new Error(`Could not add competitors: ${error.message}`);
    }
  }
  return { ok: true, count: list.length };
}
