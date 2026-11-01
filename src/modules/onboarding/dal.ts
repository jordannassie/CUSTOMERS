import "server-only";
import { providerErrorKind } from "@/lib/provider-error-kind";
import { env } from "@/lib/env";
import { liveAiClients, type UsageContext } from "@/modules/ai/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { INTENTS, type Intent } from "@/modules/question-library";
import type { Json } from "@/types/database.types";
import { autofill, type AutofillClients, type AutofillRequest, type AutofillRun } from "./autofill";
import { DuplicateBusinessError, duplicateBusiness } from "./duplicates";
import { createBusinessExtractor, ExtractError } from "./extract";
import { createFirecrawlScraper } from "./firecrawl";
import { fixtureAutofillClients, fixtureQuestionModel } from "./dev-fixtures";
import { createPlaceLookup, createPlacesSearch, type PlaceCandidate } from "./places";
import { createQuestionModel } from "./question-model";
import type { LibraryEntry } from "./question-rules";
import type { QuestionClients } from "./questions";
import type { AutofillResult } from "./schema";

// Fixture modes are refused in production so a stray flag can never show made-up data to users.
// PLACES_FIXTURES covers the competitor step, ONBOARDING_FIXTURES auto-fill and question picking.
export const onboardingFixtures = () => env.ONBOARDING_FIXTURES === "true" && env.NODE_ENV !== "production";

// A missing key turns that source off; auto-fill then works with whatever is left. Claude reads the site, with
// OpenAI as the backup (D-84); the usage context charges the cost record to the user's business.
export function liveAutofillClients(usage?: UsageContext): AutofillClients {
  if (onboardingFixtures()) return fixtureAutofillClients;
  const ai = liveAiClients(usage);
  return {
    scrape: env.FIRECRAWL_API_KEY ? createFirecrawlScraper(env.FIRECRAWL_API_KEY) : async () => [],
    searchPlaces: env.GOOGLE_PLACES_API_KEY ? createPlacesSearch(env.GOOGLE_PLACES_API_KEY) : async () => [],
    extract:
      ai.anthropic || ai.openai
        ? createBusinessExtractor(ai)
        : async () => {
            throw new ExtractError("Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set", false);
          },
  };
}

/**
 * The business's Google listing, fetched live by place_id; null when there is none or Places fails (BUG-139). When
 * the lookup fails (its daily quota is separate from search's and runs out first), the search auto-fill used finds
 * it again by the website's domain.
 */
export async function liveListing(placeId: string | null, domain: string | null): Promise<PlaceCandidate | null> {
  if (!placeId || onboardingFixtures() || !env.GOOGLE_PLACES_API_KEY) return null;
  const key = env.GOOGLE_PLACES_API_KEY;
  const byId = await createPlaceLookup(key)(placeId).catch(() => undefined);
  if (byId !== undefined || !domain) return byId ?? null;
  const found = await createPlacesSearch(key)(domain).catch((): PlaceCandidate[] => []);
  return found.find((p) => p.placeId === placeId) ?? null;
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

/**
 * The set another business of this kind in this city already has (BUG-116): its suggested questions (not the
 * owner's own), oldest business first. Questions never name a business, so sharing them is like the library.
 */
export async function loadSharedQuestions(industry: string, city: string, region: string | null): Promise<{ text: string; intent: Intent }[]> {
  const db = createServiceClient();
  // Exact matches ignoring case: % and _ in what the user typed are not wildcards.
  const exact = (v: string) => v.trim().replace(/[%_\\]/g, "\\$&");
  // Set-up businesses only: a draft's questions are not settled yet, and a deleted one's are not shared.
  let peers = db
    .from("businesses")
    .select("id")
    .ilike("industry", exact(industry))
    .ilike("primary_city", exact(city))
    .is("deleted_at", null)
    .neq("status", "onboarding");
  if (region) peers = peers.ilike("primary_region", exact(region));
  const { data: businesses, error } = await peers.order("created_at").limit(5);
  if (error) throw new Error(`Could not load businesses for shared questions: ${error.message}`);
  for (const b of businesses) {
    const { data, error: readError } = await db
      .from("tracked_prompts")
      .select("prompt, buyer_intent")
      .eq("business_id", b.id)
      .eq("source", "library")
      // The questions it asks now: never ones it paused or removed.
      .eq("active", true)
      .is("removed_at", null)
      .order("created_at");
    if (readError) throw new Error(`Could not load shared questions: ${readError.message}`);
    const set = data.filter((q) => INTENTS.includes(q.buyer_intent as Intent)).map((q) => ({ text: q.prompt, intent: q.buyer_intent as Intent }));
    if (set.length >= 6) return set;
  }
  return [];
}

// Without a key every model call fails, so the template engine fallback runs (MVP_SPEC 5.3).
export function liveQuestionClients(usage?: UsageContext): QuestionClients {
  const missing = async (): Promise<never> => {
    throw new Error("Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set");
  };
  const ai = liveAiClients(usage && { ...usage, usageType: "prompt_generation" });
  const model = ai.anthropic || ai.openai ? createQuestionModel(ai) : { pick: missing, write: missing };
  const placeTypes = async (placeId: string) => {
    const place = await liveListing(placeId, null);
    return place ? { primaryType: place.primaryType, types: place.types } : null;
  };
  return { loadLibrary: loadQuestionLibrary, loadShared: loadSharedQuestions, model: onboardingFixtures() ? fixtureQuestionModel : model, placeTypes };
}

/** Why a source gave nothing (B7): the server log, and provider_errors for the error spike alert. Never throws. */
async function recordAutofillProblems(request: AutofillRequest, problems: AutofillRun["problems"]): Promise<void> {
  if (problems.length === 0) return;
  const what = "domain" in request ? request.domain : `${request.name}, ${request.city}`;
  for (const p of problems) console.warn(`auto-fill for ${what}: ${p.provider}: ${p.message}`);
  if (onboardingFixtures()) return;
  // One row per provider and kind of failure an hour, with a count (migration 058).
  for (const p of problems) {
    const message = `Auto-fill: ${p.message}`.slice(0, 500);
    const { error } = await createServiceClient().rpc("record_provider_error", { p_provider: p.provider, p_kind: providerErrorKind(message), p_message: message });
    if (error) console.error(`Could not record the auto-fill error: ${error.message}`);
  }
}

/**
 * Runs auto-fill for one of the user's businesses. Returns null when the business is not theirs.
 * Stores only place_id from Places and the site's own facts (D-73); the form values go back to
 * the screen and are saved only when the user confirms them (B-36). With no website, no place_id
 * is saved here: the user picks their listing first (confirmBusinessPlace). Drafts only: a live business's listing and
 * chain flag are never rewritten by setup.
 */
export async function runBusinessAutofill(
  userId: string,
  businessId: string,
  request: AutofillRequest,
  clients: AutofillClients = liveAutofillClients({ accountUserId: userId, businessId }),
): Promise<AutofillResult | null> {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("status", "onboarding")
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return null;

  const run = await autofill(request, clients);

  // business_site_facts has no write policy for signed-in users, so writes use the service role
  // after the ownership check above. The problem log and both writes go at once: the user waits on this (2026-10-29).
  const service = createServiceClient();
  const [, { error: placeError }, facts] = await Promise.all([
    recordAutofillProblems(request, run.problems),
    // Whether it is a chain, and the logo, are saved every time: another website typed in later may be another shop.
    service
      .from("businesses")
      .update({ is_chain: run.chain, logo_url: run.logoUrl, ...(run.placeId ? { places_id: run.placeId } : {}) })
      .eq("id", businessId),
    run.siteFacts
      ? service
          .from("business_site_facts")
          .upsert({ business_id: businessId, data: run.siteFacts as unknown as Json, fetched_at: new Date().toISOString() })
      : null,
  ]);
  // The listing found for this website is another business's in the agency already (migration 067).
  const duplicate = duplicateBusiness(placeError);
  if (duplicate) throw new DuplicateBusinessError(duplicate);
  if (placeError) throw new Error(`Could not save place_id: ${placeError.message}`);
  if (facts?.error) throw new Error(`Could not save site facts: ${facts.error.message}`);
  return run.result;
}

/**
 * "Is one of these your business?" (MVP_SPEC 3.3): saves the listing the user picked, or clears it for
 * "None of these". Only place_id is kept (D-73). False when it is not the user's draft without a website.
 */
export async function saveBusinessPlace(userId: string, businessId: string, placeId: string | null): Promise<boolean | "duplicate"> {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("status", "onboarding")
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  // A draft with no website, or one whose website turned us away and so got the same list (2026-10-16).
  if (!business) return false;
  const { error: placeError } = await createServiceClient()
    .from("businesses")
    .update({ places_id: placeId })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  // The picked listing is another business's in the agency already (migration 067).
  if (duplicateBusiness(placeError)) return "duplicate";
  if (placeError) throw new Error(`Could not save place_id: ${placeError.message}`);
  return true;
}

export {
  liveCompetitorPlaces,
  loadCompetitorStep,
  lookupCompetitor,
  saveCompetitors,
  type CompetitorStep,
  type SavedCompetitor,
  type SaveCompetitorsResult,
} from "./competitor-step/dal";
