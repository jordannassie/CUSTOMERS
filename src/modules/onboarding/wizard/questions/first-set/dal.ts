import "server-only";
// The business's first suggested questions (MVP_SPEC 3.1 step 6). Making them asks Claude and took about 15 seconds,
// all of it on the questions step's Continue (2026-10-29). Now saving the details step also starts them in the
// background (warmFirstQuestions), so the set is usually saved before the user reaches the questions step, which then
// only reads it. The questions step still makes the set itself when it is not there yet.
import { createServiceClient } from "@/lib/supabase/service";
import { liveQuestionClients } from "../../../dal";
import { namesOwnBusiness } from "../../../question-kind";
import { cityLabel } from "../../../question-rules";
import { placeTypesOf, prepareQuestions, type QuestionClients, type QuestionSet } from "../../../questions";
import { questionBasisChanged, type QuestionBasis } from "../rebuild/dal";
import { stepNumber } from "../../steps";

/** What the set is made from: the business's own columns. */
export const FIRST_SET_COLUMNS =
  "name, aliases, domain, industry, services, description, primary_city, primary_region, primary_area, places_id, is_chain" as const;

export type FirstSetBusiness = {
  name: string;
  aliases: string[];
  domain: string | null;
  industry: string | null;
  services: string[];
  description: string | null;
  primary_city: string;
  primary_region: string | null;
  primary_area: string | null;
  places_id: string | null;
  is_chain: boolean;
};

type Rival = { name: string; aliases: string[] | null };

const rivalNames = (rivals: Rival[]) => rivals.flatMap((c) => [c.name, ...(c.aliases ?? [])]);

export async function prepareFirstSet(b: FirstSetBusiness, rivals: Rival[], clients: QuestionClients): Promise<QuestionSet> {
  const set = await prepareQuestions(
    {
      industry: b.industry,
      industryText: b.industry ?? undefined,
      services: b.services,
      description: b.description ?? "",
      city: b.primary_city,
      region: b.primary_region,
      // Set: about a third of the questions are asked about this neighborhood instead of the whole city.
      area: b.primary_area,
      name: b.name,
      aliases: b.aliases,
      domain: b.domain,
      // Competitors' names never appear in a question (2026-10-16).
      competitors: rivalNames(rivals),
      chain: b.is_chain,
      // Google's types, read live (D-73): a fast food listing gets fast food questions.
      ...(await placeTypesOf(b.places_id, clients)),
    },
    clients,
  );
  if (set.error) console.warn(`Question picking fell back (${set.source}): ${set.error}`);
  return set;
}

// Rows saved in one insert share a timestamp, so each gets its own to keep the list in order.
const inOrder = (i: number, from: number) => new Date(from + i).toISOString();

/**
 * Saves the set unless the business has questions already. Two at once (the background start and the questions step,
 * a refresh, a second tab) each prepare a set; the business row lock in save_first_questions keeps the first saved one
 * and hands it to the other too. Returns the business's questions.
 */
export async function saveFirstSet(userId: string, businessId: string, b: FirstSetBusiness, set: QuestionSet): Promise<{ prompt: string }[]> {
  const location = cityLabel(b.primary_city, b.primary_region);
  const now = Date.now();
  const { data, error } = await createServiceClient().rpc("save_first_questions", {
    p_business_id: businessId,
    p_owner_user_id: userId,
    // tracked_prompts.source allows library, custom or legacy, and custom means the user wrote it. Questions Claude
    // wrote or the fallback made are our suggestions too, so they are stored as library (BUG-9).
    p_questions: set.questions.map((q, i) => ({ prompt: q.text, buyer_intent: q.intent, location, source: "library", created_at: inOrder(i, now) })),
  });
  if (error) throw new Error(`Could not save questions: ${error.message}`);
  return data;
}

const basisOf = (b: FirstSetBusiness): QuestionBasis => ({
  industry: b.industry,
  services: b.services,
  city: b.primary_city,
  region: b.primary_region,
  area: b.primary_area,
});

async function loadDraft(userId: string, businessId: string): Promise<FirstSetBusiness | null> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select(FIRST_SET_COLUMNS)
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("status", "onboarding")
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  return data?.primary_city ? { ...data, primary_city: data.primary_city } : null;
}

/**
 * Started when the details step is saved: makes and saves the draft's first question set, unless it has one. Nothing is
 * saved when the model failed (the questions step then tries again itself) or when the details changed or the draft
 * started over while it ran (that set is for the old details). Call only after the caller has checked the business is
 * the user's draft.
 */
export async function warmFirstQuestions(userId: string, businessId: string, clients?: QuestionClients): Promise<"saved" | "skipped"> {
  const db = createServiceClient();
  const before = await loadDraft(userId, businessId);
  if (!before) return "skipped";
  const [active, rivals] = await Promise.all([
    db.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
    db.from("business_competitors").select("name, aliases").eq("business_id", businessId),
  ]);
  if (active.error) throw new Error(`Could not load questions: ${active.error.message}`);
  if (rivals.error) throw new Error(`Could not load competitors: ${rivals.error.message}`);
  if ((active.count ?? 0) > 0) return "skipped";

  const set = await prepareFirstSet(before, rivals.data, clients ?? liveQuestionClients({ accountUserId: userId, businessId }));
  if (set.source === "fallback") return "skipped";
  const after = await loadDraft(userId, businessId);
  if (!after || questionBasisChanged(basisOf(before), basisOf(after))) return "skipped";
  await saveFirstSet(userId, businessId, after, set);
  return "saved";
}

/**
 * The questions the step shows. A set made in the background was made before the competitors were picked, so until
 * the step is saved a suggestion naming one of them is left out (saving then removes it), as making the set on this
 * step would have done. The user's own questions always show.
 */
export function shownQuestions(rows: { prompt: string; source: string }[], rivals: Rival[], city: string, step: number | null): string[] {
  const names = rivalNames(rivals);
  if ((step ?? 0) > stepNumber("questions") || names.length === 0) return rows.map((r) => r.prompt);
  const kept = rows.filter((r) => r.source === "custom" || !namesOwnBusiness(r.prompt, { city, competitors: names }));
  return (kept.length ? kept : rows).map((r) => r.prompt);
}
