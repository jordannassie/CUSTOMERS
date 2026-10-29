import "server-only";
// A business whose industry or place changes after its questions were made (back on the details step, or in Settings)
// gets questions for the new one: a bakery's "best sushi" questions say nothing about a coffee shop, and questions
// about Austin say nothing about a shop that moved to Dallas. The questions we suggested are removed (inactive with
// removed_at, like any other removal), never deleted, so past scan results keep them; the user's own questions stay.
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

/** What the suggested questions are written for: the trade, the services and the place. */
export type QuestionBasis = {
  industry: string | null;
  city: string | null;
  region: string | null;
  area: string | null;
  /** Compared only when both sides have them: Settings leaves them out. */
  services?: string[];
};

const serviceSet = (list: string[]) => [...new Set(list.map((s) => s.trim().toLowerCase()).filter(Boolean))].sort().join("\n");

/** True when the trade, services, city, region or area changed (ignoring case, spacing and order), so the suggestions are out of date. */
export function questionBasisChanged(before: QuestionBasis, after: QuestionBasis): boolean {
  if (before.services && after.services && serviceSet(before.services) !== serviceSet(after.services)) return true;
  return (["industry", "city", "region", "area"] as const).some((k) => !sameIndustry(before[k], after[k]));
}

/** The saved industry, services and place; the caller has already checked the business is the user's. */
export async function savedQuestionBasis(businessId: string): Promise<QuestionBasis | null> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("industry, services, primary_city, primary_region, primary_area")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  return data && { industry: data.industry, services: data.services, city: data.primary_city, region: data.primary_region, area: data.primary_area };
}

export type RebuildResult = { rebuilt: false } | { rebuilt: true; added: number; retired: number };

/**
 * Replaces the business's suggested questions with a set for its current industry and place. Does nothing before the first
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

  const { data: current, error: activeError } = await db
    .from("tracked_prompts")
    .select("id, prompt, source, active")
    .eq("business_id", businessId)
    .is("removed_at", null);
  if (activeError) throw new Error(`Could not load questions: ${activeError.message}`);
  const active = (current ?? []).filter((q) => q.active);
  if (!active.length) return { rebuilt: false };

  const { data: rivals } = await db.from("business_competitors").select("name, aliases").eq("business_id", businessId);
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
      // Competitors' names never appear in a question (2026-10-16).
      competitors: (rivals ?? []).flatMap((c) => [c.name, ...(c.aliases ?? [])]),
      chain: b.is_chain,
      // Google's types, read live (D-73): a fast food listing gets fast food questions.
      ...(await placeTypesOf(b.places_id, questionClients)),
    },
    questionClients,
  );
  if (set.error) console.warn(`Question rebuild fell back (${set.source}): ${set.error}`);

  const own = active.filter((q) => q.source === "custom");
  // Paused suggestions go too: Resume would bring back a question for the old trade or place.
  const retired = (current ?? []).filter((q) => q.source !== "custom").map((q) => q.id);
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
    // removed_at too, or the Questions page shows them as paused with Resume, and they block adding the same text.
    const { error: retireError } = await db
      .from("tracked_prompts")
      .update({ active: false, removed_at: new Date().toISOString() })
      .in("id", retired)
      .eq("business_id", businessId);
    if (retireError) throw new Error(`Could not retire the old questions: ${retireError.message}`);
  }
  return { rebuilt: true, added: rows.length, retired: retired.length };
}
