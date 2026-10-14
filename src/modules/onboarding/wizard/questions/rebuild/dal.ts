import "server-only";
// A business whose industry changes after its questions were made (back on the details step, or in Settings) gets
// questions for the new industry: a bakery's "best sushi" questions say nothing about a coffee shop. The questions
// we suggested are set inactive, never deleted, so past scan results keep them; the user's own questions stay.
import { createServiceClient } from "@/lib/supabase/service";
import { maxQuestions } from "@/modules/entitlements";
import { liveQuestionClients } from "../../../dal";
import { cityLabel } from "../../../question-rules";
import { placeTypesOf, prepareQuestions, type QuestionClients } from "../../../questions";

// Used when the plan sets no limit (Enterprise): MVP_SPEC 3.1 step 6 caps questions at 25.
const QUESTION_CAP = 25;

/** Same industry in other words: "Bookstore" and "bookstore", or both empty. */
export function sameIndustry(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/** The saved industry; the caller has already checked the business is the user's. */
export async function savedIndustry(businessId: string): Promise<string | null> {
  const { data, error } = await createServiceClient().from("businesses").select("industry").eq("id", businessId).maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  return data?.industry ?? null;
}

export type RebuildResult = { rebuilt: false } | { rebuilt: true; added: number; retired: number };

/**
 * Replaces the business's suggested questions with a set for its current industry. Does nothing before the first
 * set exists: the questions step makes that one. Call only after the caller has checked the business is the user's.
 */
export async function rebuildQuestionsForIndustry(businessId: string, clients?: QuestionClients): Promise<RebuildResult> {
  const db = createServiceClient();
  const { data: b, error } = await db
    .from("businesses")
    .select("owner_user_id, name, aliases, domain, industry, services, description, primary_city, primary_region, primary_area, places_id, is_chain")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b?.primary_city) return { rebuilt: false };

  const { data: active, error: activeError } = await db
    .from("tracked_prompts")
    .select("id, prompt, source")
    .eq("business_id", businessId)
    .eq("active", true);
  if (activeError) throw new Error(`Could not load questions: ${activeError.message}`);
  if (!active?.length) return { rebuilt: false };

  const questionClients = clients ?? liveQuestionClients({ accountUserId: b.owner_user_id, businessId });
  const set = await prepareQuestions(
    {
      industry: b.industry,
      industryText: b.industry ?? undefined,
      services: b.services,
      description: b.description ?? "",
      city: b.primary_city,
      region: b.primary_region,
      area: b.primary_area,
      name: b.name,
      aliases: b.aliases,
      domain: b.domain,
      chain: b.is_chain,
      // Google's types, read live (D-73): a fast food listing gets fast food questions.
      ...(await placeTypesOf(b.places_id, questionClients)),
    },
    questionClients,
  );
  if (set.error) console.warn(`Question rebuild fell back (${set.source}): ${set.error}`);

  const own = active.filter((q) => q.source === "custom");
  const retired = active.filter((q) => q.source !== "custom").map((q) => q.id);
  const limit = (await maxQuestions(businessId)).limit ?? QUESTION_CAP;
  const taken = new Set(own.map((q) => q.prompt.trim().toLowerCase()));
  const location = cityLabel(b.primary_city, b.primary_region);
  const now = Date.now();
  const rows = set.questions
    .filter((q) => !taken.has(q.text.trim().toLowerCase()))
    .slice(0, Math.max(0, limit - own.length))
    .map((q, i) => ({
      business_id: businessId,
      prompt: q.text,
      buyer_intent: q.intent,
      location,
      // Our suggestions are stored as library, whoever wrote them (BUG-9), so a later rebuild retires them too.
      source: "library",
      created_at: new Date(now + i).toISOString(),
    }));

  // New set first, then the old one retired, so the business is never left with no questions.
  if (rows.length) {
    const { error: insertError } = await db.from("tracked_prompts").insert(rows);
    if (insertError) throw new Error(`Could not save the new questions: ${insertError.message}`);
  }
  if (retired.length) {
    const { error: retireError } = await db.from("tracked_prompts").update({ active: false }).in("id", retired).eq("business_id", businessId);
    if (retireError) throw new Error(`Could not retire the old questions: ${retireError.message}`);
  }
  return { rebuilt: true, added: rows.length, retired: retired.length };
}
