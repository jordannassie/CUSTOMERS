import "server-only";
import { env } from "@/lib/env";
import { liveAiClients, type UsageContext } from "@/modules/ai/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { INTENTS, type Intent } from "@/modules/question-library";
import type { Json } from "@/types/database.types";
import { autofill, type AutofillClients, type AutofillRequest, type AutofillRun } from "./autofill";
import { createBusinessExtractor, ExtractError } from "./extract";
import { createFirecrawlScraper } from "./firecrawl";
import { fixtureAutofillClients, fixtureQuestionModel } from "./dev-fixtures";
import { createPlacesSearch } from "./places";
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
  let peers = db.from("businesses").select("id").ilike("industry", exact(industry)).ilike("primary_city", exact(city)).is("deleted_at", null);
  if (region) peers = peers.ilike("primary_region", exact(region));
  const { data: businesses, error } = await peers.order("created_at").limit(5);
  if (error) throw new Error(`Could not load businesses for shared questions: ${error.message}`);
  for (const b of businesses) {
    const { data, error: readError } = await db
      .from("tracked_prompts")
      .select("prompt, buyer_intent")
      .eq("business_id", b.id)
      .eq("source", "library")
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
  return { loadLibrary: loadQuestionLibrary, loadShared: loadSharedQuestions, model: onboardingFixtures() ? fixtureQuestionModel : model };
}

/** Why a source gave nothing (B7): the server log, and provider_errors for the error spike alert. Never throws. */
async function recordAutofillProblems(request: AutofillRequest, problems: AutofillRun["problems"]): Promise<void> {
  if (problems.length === 0) return;
  const what = "domain" in request ? request.domain : `${request.name}, ${request.city}`;
  for (const p of problems) console.warn(`auto-fill for ${what}: ${p.provider}: ${p.message}`);
  if (onboardingFixtures()) return;
  const { error } = await createServiceClient()
    .from("provider_errors")
    .insert(problems.map((p) => ({ provider: p.provider, message: `Auto-fill: ${p.message}`.slice(0, 500) })));
  if (error) console.error(`Could not record the auto-fill errors: ${error.message}`);
}

/**
 * Runs auto-fill for one of the user's businesses. Returns null when the business is not theirs.
 * Stores only place_id from Places and the site's own facts (D-73); the form values go back to
 * the screen and are saved only when the user confirms them (B-36). With no website, no place_id
 * is saved here: the user picks their listing first (confirmBusinessPlace).
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
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return null;

  const run = await autofill(request, clients);
  await recordAutofillProblems(request, run.problems);

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

/**
 * "Is one of these your business?" (MVP_SPEC 3.3): saves the listing the user picked, or clears it for
 * "None of these". Only place_id is kept (D-73). False when it is not the user's business without a website.
 */
export async function saveBusinessPlace(userId: string, businessId: string, placeId: string | null): Promise<boolean> {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("has_website", false)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!business) return false;
  const { error: placeError } = await createServiceClient()
    .from("businesses")
    .update({ places_id: placeId })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
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
