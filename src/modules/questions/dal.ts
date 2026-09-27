import "server-only";
import { requireAgency } from "@/modules/auth";
import type { ScanFrequency } from "@/modules/credits";
import { maxQuestions } from "@/modules/entitlements";
import { CHECK_MODELS, loadQuestionResults, type ProviderId } from "@/modules/scanning";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { questionsView, sameQuestion, tidyQuestion, type QuestionsView } from "./service";

const FREQUENCIES: readonly string[] = ["daily", "weekly", "monthly"] satisfies ScanFrequency[];
const isModel = (m: string): m is ProviderId => m in CHECK_MODELS;

/** The Questions page for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getQuestionsPage(businessId: string, next: string): Promise<QuestionsView | null> {
  const { agency } = await requireAgency({ next });
  return loadQuestionsPage(agency.id, businessId, new Date());
}

// Callers check the user may see this agency first.
export async function loadQuestionsPage(agencyId: string, businessId: string, now: Date): Promise<QuestionsView | null> {
  const db = createServiceClient();
  const [business, questions] = await Promise.all([
    db
      .from("businesses")
      .select("id, models, scan_frequency, primary_city")
      .eq("id", businessId)
      .eq("agency_id", agencyId)
      .maybeSingle(),
    db.from("tracked_prompts").select("id, prompt, active, source").eq("business_id", businessId).order("created_at").order("id"),
  ]);
  for (const r of [business, questions]) if (r.error) throw new Error(`Questions: ${r.error.message}`);
  if (!business.data) return null;

  const models = business.data.models.filter(isModel);
  const [results, limit] = await Promise.all([loadQuestionResults(businessId, models, now), maxQuestions(businessId)]);
  return questionsView({
    businessId,
    city: business.data.primary_city,
    models,
    frequency: FREQUENCIES.includes(business.data.scan_frequency) ? (business.data.scan_frequency as ScanFrequency) : "weekly",
    questions: questions.data!,
    results,
    limit: limit.limit,
  });
}

export type ChangeResult = { ok: true } | { ok: false; status: 400 | 403 | 404; error: string };

const notFound: ChangeResult = { ok: false, status: 404, error: "We could not find that question. Refresh the page and try again." };
const duplicate: ChangeResult = { ok: false, status: 400, error: "You already track this question." };

// Writes go through the signed-in user's client, so RLS (tracked_prompts_owner_all) also guards them.
async function ownedQuestions(businessId: string) {
  const { agency } = await requireAgency();
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .maybeSingle();
  if (error) throw new Error(`Questions: could not load the business: ${error.message}`);
  if (!business) return null;
  const { data: questions, error: readError } = await supabase
    .from("tracked_prompts")
    .select("id, prompt, active")
    .eq("business_id", businessId);
  if (readError) throw new Error(`Questions: could not load questions: ${readError.message}`);
  return { supabase, questions };
}

async function roomForOneMore(businessId: string): Promise<ChangeResult | null> {
  const limit = await maxQuestions(businessId);
  return limit.allowed ? null : { ok: false, status: 403, error: limit.reason };
}

export async function insertQuestion(businessId: string, text: string): Promise<ChangeResult> {
  const owned = await ownedQuestions(businessId);
  if (!owned) return notFound;
  const prompt = tidyQuestion(text);
  if (owned.questions.some((q) => sameQuestion(q.prompt, prompt))) return duplicate;
  const full = await roomForOneMore(businessId);
  if (full) return full;
  const { error } = await owned.supabase.from("tracked_prompts").insert({ business_id: businessId, prompt, source: "custom", active: true });
  if (error) throw new Error(`Questions: could not add the question: ${error.message}`);
  return { ok: true };
}

/** An edited question is the user's own wording from then on, so it counts as custom. */
export async function updateQuestionText(businessId: string, questionId: string, text: string): Promise<ChangeResult> {
  const owned = await ownedQuestions(businessId);
  if (!owned || !owned.questions.some((q) => q.id === questionId)) return notFound;
  const prompt = tidyQuestion(text);
  if (owned.questions.some((q) => q.id !== questionId && sameQuestion(q.prompt, prompt))) return duplicate;
  const { error } = await owned.supabase.from("tracked_prompts").update({ prompt, source: "custom" }).eq("id", questionId);
  if (error) throw new Error(`Questions: could not save the question: ${error.message}`);
  return { ok: true };
}

export async function updateQuestionActive(businessId: string, questionId: string, active: boolean): Promise<ChangeResult> {
  const owned = await ownedQuestions(businessId);
  const question = owned?.questions.find((q) => q.id === questionId);
  if (!owned || !question) return notFound;
  if (question.active === active) return { ok: true };
  if (active) {
    const full = await roomForOneMore(businessId);
    if (full) return full;
  }
  const { error } = await owned.supabase.from("tracked_prompts").update({ active }).eq("id", questionId);
  if (error) throw new Error(`Questions: could not ${active ? "resume" : "pause"} the question: ${error.message}`);
  return { ok: true };
}

/** Deletes the question and, through the foreign key, its saved checks. */
export async function deleteQuestion(businessId: string, questionId: string): Promise<ChangeResult> {
  const owned = await ownedQuestions(businessId);
  if (!owned || !owned.questions.some((q) => q.id === questionId)) return notFound;
  const { error } = await owned.supabase.from("tracked_prompts").delete().eq("id", questionId);
  if (error) throw new Error(`Questions: could not remove the question: ${error.message}`);
  return { ok: true };
}
