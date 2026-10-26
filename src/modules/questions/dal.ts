import "server-only";
import { requireAgency } from "@/modules/auth";
import type { ScanFrequency } from "@/modules/credits";
import { maxQuestions } from "@/modules/entitlements";
import { CHECK_MODELS, isOwnQuestion, loadQuestionResults, type ProviderId } from "@/modules/scanning";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { questionSummaries, loadStanding } from "@/modules/standing";
import { latestAnswers, type QuestionAnswer } from "./answers";
import { editMakesNewQuestion, questionsView, sameQuestion, tidyQuestion, type QuestionsView } from "./service";

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
      .select("id, name, models, scan_frequency, primary_city, industry")
      .eq("id", businessId)
      .eq("agency_id", agencyId)
      .maybeSingle(),
    // A removed question is kept for past scores (step 9e) but never listed again.
    db.from("tracked_prompts").select("id, prompt, active, source").eq("business_id", businessId).is("removed_at", null).order("created_at").order("id"),
  ]);
  for (const r of [business, questions]) if (r.error) throw new Error(`Questions: ${r.error.message}`);
  if (!business.data) return null;

  const models = business.data.models.filter(isModel);
  const [results, limit, standing] = await Promise.all([
    loadQuestionResults(businessId, models, now),
    maxQuestions(businessId),
    // Saved answers only: who AI named on each question and the sites it used without you.
    loadStanding(agencyId, businessId, now),
  ]);
  const summaries = standing ? questionSummaries([...standing.checks, ...standing.ownChecks], standing.you.domain) : undefined;
  return questionsView({
    businessId,
    businessName: business.data.name,
    city: business.data.primary_city,
    industry: business.data.industry,
    models,
    frequency: FREQUENCIES.includes(business.data.scan_frequency) ? (business.data.scan_frequency as ScanFrequency) : "weekly",
    questions: questions.data!.map(({ source, ...q }) => ({ ...q, own: isOwnQuestion(source) })),
    results,
    limit: limit.limit,
    summaries,
  });
}

// Enough rows to find the newest answer from every model, even after a few scans with one model failing.
const ANSWER_ROWS = 30;

/** The latest answer per model for one question (BUG-089); null when the question is not this agency's. */
export async function loadQuestionAnswers(agencyId: string, businessId: string, questionId: string): Promise<QuestionAnswer[] | null> {
  const db = createServiceClient();
  const [business, question] = await Promise.all([
    db.from("businesses").select("models").eq("id", businessId).eq("agency_id", agencyId).maybeSingle(),
    db.from("tracked_prompts").select("id").eq("id", questionId).eq("business_id", businessId).maybeSingle(),
  ]);
  for (const r of [business, question]) if (r.error) throw new Error(`Questions: ${r.error.message}`);
  if (!business.data || !question.data) return null;
  // The rows that count: never sample answers once the agency is real (migration 044).
  const { data, error } = await db
    .from("visibility_results_counted")
    .select("provider, created_at, business_mentioned, competitors_mentioned, answer_text, cached, extracted_names, cited_sources")
    .eq("business_id", businessId)
    .eq("tracked_prompt_id", questionId)
    .order("created_at", { ascending: false })
    .limit(ANSWER_ROWS);
  if (error) throw new Error(`Questions: could not load answers: ${error.message}`);
  const rows = data.map((r) => ({
    provider: r.provider ?? "",
    created_at: r.created_at ?? "",
    business_mentioned: r.business_mentioned ?? false,
    competitors_mentioned: r.competitors_mentioned,
    answer_text: r.answer_text,
    cached: r.cached,
    extracted_names: r.extracted_names,
    cited_sources: r.cited_sources,
  }));
  return latestAnswers(rows, business.data.models.filter(isModel));
}

type ChangeFailure = { ok: false; status: 400 | 403 | 404; error: string };
export type ChangeResult = { ok: true } | ChangeFailure;

const notFound: ChangeFailure = { ok: false, status: 404, error: "We could not find that question. Refresh the page and try again." };
const duplicate: ChangeFailure = { ok: false, status: 400, error: "You already track this question." };

// The writes below take the agency from the action's auth guard and check the business is the agency's. Users can't
// write tracked_prompts themselves (migration 047, SEC-10), so the writes use the service role, scoped to the business.
async function ownedQuestions(agencyId: string, businessId: string) {
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (error) throw new Error(`Questions: could not load the business: ${error.message}`);
  if (!business) return null;
  const { data: questions, error: readError } = await supabase
    .from("tracked_prompts")
    .select("id, prompt, active, source")
    .eq("business_id", businessId)
    .is("removed_at", null);
  if (readError) throw new Error(`Questions: could not load questions: ${readError.message}`);
  return { supabase, questions };
}

async function roomForOneMore(businessId: string): Promise<ChangeResult | null> {
  const limit = await maxQuestions(businessId);
  return limit.allowed ? null : { ok: false, status: 403, error: limit.reason };
}

export async function insertQuestion(agencyId: string, businessId: string, text: string): Promise<ChangeResult> {
  const owned = await ownedQuestions(agencyId, businessId);
  if (!owned) return notFound;
  const prompt = tidyQuestion(text);
  if (owned.questions.some((q) => sameQuestion(q.prompt, prompt))) return duplicate;
  const full = await roomForOneMore(businessId);
  if (full) return full;
  const { error } = await createServiceClient().from("tracked_prompts").insert({ business_id: businessId, prompt, source: "custom", active: true });
  if (error) throw new Error(`Questions: could not add the question: ${error.message}`);
  return { ok: true };
}

export type EditResult = { ok: true; newQuestion: boolean } | ChangeFailure;

async function hasAnswers(questionId: string): Promise<boolean> {
  const { count, error } = await createServiceClient()
    .from("visibility_results")
    .select("id", { count: "exact", head: true })
    .eq("tracked_prompt_id", questionId);
  if (error) throw new Error(`Questions: could not read answers: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * An edited question is the user's own wording from then on, so it counts as custom (M2). A suggested question, or one
 * of the user's own that already has answers, becomes a new question and the old one is paused: its answers belong to
 * the old wording, so they stay with it (and a paused suggested question keeps counting in past scores, step 9e).
 * The new one takes the old one's place, active or paused, so the active count and the plan limit do not change.
 */
export async function updateQuestionText(agencyId: string, businessId: string, questionId: string, text: string): Promise<EditResult> {
  const owned = await ownedQuestions(agencyId, businessId);
  const question = owned?.questions.find((q) => q.id === questionId);
  if (!owned || !question) return notFound;
  const prompt = tidyQuestion(text);
  if (question.prompt === prompt) return { ok: true, newQuestion: false };
  if (owned.questions.some((q) => q.id !== questionId && sameQuestion(q.prompt, prompt))) return duplicate;
  const db = createServiceClient();
  if (!editMakesNewQuestion({ custom: isOwnQuestion(question.source), answered: await hasAnswers(questionId) })) {
    const { error } = await db.from("tracked_prompts").update({ prompt, source: "custom" }).eq("id", questionId).eq("business_id", businessId);
    if (error) throw new Error(`Questions: could not save the question: ${error.message}`);
    return { ok: true, newQuestion: false };
  }
  const { data: added, error } = await db
    .from("tracked_prompts")
    .insert({ business_id: businessId, prompt, source: "custom", active: question.active })
    .select("id")
    .single();
  if (error) throw new Error(`Questions: could not add the new question: ${error.message}`);
  // Pausing sets inactive_since (migration 054). Never removed_at: the old question stays listed with its results.
  const { error: pauseError } = await db.from("tracked_prompts").update({ active: false }).eq("id", questionId).eq("business_id", businessId);
  if (pauseError) {
    // Undo, so there are never two active copies. The new row has no answers yet.
    await db.from("tracked_prompts").delete().eq("id", added.id);
    throw new Error(`Questions: could not pause the old question: ${pauseError.message}`);
  }
  return { ok: true, newQuestion: true };
}

export async function updateQuestionActive(agencyId: string, businessId: string, questionId: string, active: boolean): Promise<ChangeResult> {
  const owned = await ownedQuestions(agencyId, businessId);
  const question = owned?.questions.find((q) => q.id === questionId);
  if (!owned || !question) return notFound;
  if (question.active === active) return { ok: true };
  if (active) {
    const full = await roomForOneMore(businessId);
    if (full) return full;
  }
  const { error } = await createServiceClient().from("tracked_prompts").update({ active }).eq("id", questionId).eq("business_id", businessId);
  if (error) throw new Error(`Questions: could not ${active ? "resume" : "pause"} the question: ${error.message}`);
  return { ok: true };
}

/**
 * Removes the question from the list and stops asking it. Its saved answers are kept, so past weekly scores stay as
 * they were (step 9e); deleting the row deleted them through the foreign key.
 */
export async function deleteQuestion(agencyId: string, businessId: string, questionId: string): Promise<ChangeResult> {
  const owned = await ownedQuestions(agencyId, businessId);
  if (!owned || !owned.questions.some((q) => q.id === questionId)) return notFound;
  const { error } = await createServiceClient()
    .from("tracked_prompts")
    .update({ active: false, removed_at: new Date().toISOString() })
    .eq("id", questionId)
    .eq("business_id", businessId);
  if (error) throw new Error(`Questions: could not remove the question: ${error.message}`);
  return { ok: true };
}
