import "server-only";
import { countryCode } from "@/lib/countries";
import { isIndustry } from "@/lib/industries";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { liveListing } from "../../dal";
import type { AutofillOutput } from "../../prompts/business-autofill.v1";
import type { BusinessDetails } from "../../schema";
import type { QuestionClients } from "../../questions";
import { ownDraftStep } from "../dal";
import { questionBasisChanged, rebuildQuestionsForIndustry, savedQuestionBasis } from "../questions/rebuild/dal";
import { refillDetails } from "../refill";
import type { DetailsStepInput } from "../schema";
import { nextStepNumber } from "../steps";

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
export async function saveDetails(userId: string, input: DetailsStepInput, clients?: QuestionClients): Promise<boolean> {
  const current = await ownDraftStep(userId, input.businessId);
  if (current === undefined) return false;
  const before = await savedQuestionBasis(input.businessId);
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
  // Back on this step with a new industry, city, region or area: the questions already made were for the old one.
  const after = { industry: input.industry, city: input.city, region: input.state || null, area: input.area === undefined ? (before?.area ?? null) : input.area };
  if (before && questionBasisChanged(before, after)) await rebuildQuestionsForIndustry(input.businessId, clients);
  return true;
}
