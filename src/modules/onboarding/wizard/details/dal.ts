import "server-only";
import { countryCode } from "@/lib/countries";
import { isIndustry } from "@/lib/industries";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { liveListing } from "../../dal";
import { keepCompetitorsNear, savedLocation } from "../../competitor-location/dal";
import type { CompetitorPlaces } from "../../competitor-places";
import type { AutofillOutput } from "../../prompts/business-autofill.v1";
import type { BusinessDetails } from "../../schema";
import type { QuestionClients } from "../../questions";
import { ownDraftStep } from "../dal";
import { questionBasisChanged, rebuildQuestionsForIndustry, savedQuestionBasis } from "../questions/rebuild/dal";
import { refillDetails } from "../refill";
import type { DetailsStepInput } from "../schema";
import { nextStepNumber, stepNumber } from "../steps";

// Step 4 (MVP_SPEC 3.1): what the details form starts from, and saving what the user confirmed.

export type DetailsStep = {
  businessId: string;
  domain: string | null;
  hasWebsite: boolean;
  /** Saved values once confirmed, else the business's own site facts; the screen adds the fresh auto-fill. */
  details: BusinessDetails;
  /** The user's own words for their trade when the industry is "other". */
  industryText: string;
  /** Other names customers and AI use for it ("KFC"); only ever typed by the user. */
  aliases: string[];
  confirmed: boolean;
};

export async function loadDetailsStep(userId: string, businessId: string): Promise<DetailsStep | null> {
  const supabase = await createClient();
  const { data: b, error } = await supabase
    .from("businesses")
    .select("name, domain, has_website, industry, description, services, aliases, primary_city, primary_region, primary_country, primary_area, phone, onboarding_step, places_id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b) return null;

  const confirmed = (b.onboarding_step ?? 0) > 4;
  const saved: BusinessDetails = {
    // Before confirming, the name is only the typed domain, so it is not offered as the name.
    name: confirmed || !b.has_website ? b.name : "",
    industry: (b.industry && isIndustry(b.industry) ? b.industry : b.industry ? "other" : "") as BusinessDetails["industry"],
    description: b.description ?? "",
    services: b.services,
    city: b.primary_city ?? "",
    state: b.primary_region ?? "",
    country: b.primary_country ?? "",
    area: b.primary_area ?? "",
    phone: b.phone ?? "",
    address: "",
  };
  let refill: ReturnType<typeof refillDetails> = { details: saved, industryText: null };
  if (!confirmed) {
    const [facts, place] = await Promise.all([
      b.has_website ? supabase.from("business_site_facts").select("data").eq("business_id", businessId).maybeSingle() : null,
      liveListing(b.places_id, b.domain),
    ]);
    refill = refillDetails(saved, (facts?.data?.data as { facts?: AutofillOutput | null } | null)?.facts ?? null, place);
  }
  const industryText = refill.industryText ?? (b.industry && !isIndustry(b.industry) ? b.industry : "");
  return { businessId, domain: b.domain, hasWebsite: b.has_website !== false, details: refill.details, industryText, aliases: b.aliases, confirmed };
}

/** Step 4: saves what the user confirmed about their own draft business. False when it is not their draft. */
export async function saveDetails(
  userId: string,
  input: DetailsStepInput,
  clients?: QuestionClients,
  places?: CompetitorPlaces,
): Promise<boolean> {
  const current = await ownDraftStep(userId, input.businessId);
  if (current === undefined) return false;
  const [before, location] = await Promise.all([savedQuestionBasis(input.businessId), savedLocation(input.businessId)]);
  const { error } = await createServiceClient()
    .from("businesses")
    .update({
      name: input.name,
      industry: input.industry,
      description: input.description || null,
      services: input.services,
      ...(input.aliases === undefined ? {} : { aliases: input.aliases }),
      primary_city: input.city,
      primary_region: input.state || null,
      primary_country: countryCode(input.country) || null,
      ...(input.area === undefined ? {} : { primary_area: input.area }),
      phone: input.phone || null,
      onboarding_step: nextStepNumber(current, "details"),
    })
    .eq("id", input.businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save business details: ${error.message}`);
  // Back on this step with a new city, region or country: competitors picked from Google for the old place go, and the
  // competitors step says so once.
  await keepCompetitorsNear(input.businessId, location, { places });
  // Back on this step with a new industry, services, city, region or area: the questions already made were for the old
  // one. The user's own questions stay, and the questions step says once that the suggestions changed.
  const after = {
    industry: input.industry,
    services: input.services,
    city: input.city,
    region: input.state || null,
    area: input.area === undefined ? (before?.area ?? null) : input.area,
  };
  if (before && questionBasisChanged(before, after)) {
    // Not shown yet (the set the details step started in the background, first-set/dal.ts): dropped without asking Claude
    // or a notice, and this save starts a set for the new details instead.
    if ((current ?? 0) < stepNumber("questions")) await retireSuggestions(input.businessId);
    else {
      const rebuilt = await rebuildQuestionsForIndustry(input.businessId, clients);
      if (rebuilt.rebuilt) await markQuestionsUpdated(input.businessId);
    }
  }
  return true;
}

/** Removes the suggested questions (the user's own stay), like any other removal: inactive with removed_at. */
async function retireSuggestions(businessId: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("tracked_prompts")
    .update({ active: false, removed_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .neq("source", "custom")
    .is("removed_at", null);
  if (error) throw new Error(`Could not remove the old questions: ${error.message}`);
}

async function markQuestionsUpdated(businessId: string): Promise<void> {
  const { error } = await createServiceClient().from("businesses").update({ questions_updated_at: new Date().toISOString() }).eq("id", businessId);
  if (error) throw new Error(`Could not save the questions notice: ${error.message}`);
}
