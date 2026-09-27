import "server-only";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { INTENTS, type Intent } from "@/modules/question-library";
import type { Json } from "@/types/database.types";
import { autofill, type AutofillClients, type AutofillRequest } from "./autofill";
import { createBusinessExtractor, ExtractError } from "./extract";
import { createFirecrawlScraper } from "./firecrawl";
import { createPlacesSearch } from "./places";
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
