import "server-only";
import { requireAgency } from "@/modules/auth";
import type { ScanFrequency } from "@/modules/credits";
import { maxQuestions } from "@/modules/entitlements";
import { CHECK_MODELS, isOwnQuestion, type ProviderId } from "@/modules/scanning";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { questionSummaries, loadStanding } from "@/modules/standing";
import { focusMatches } from "./focus";
import { readFocusAnswers } from "./focus-answers/dal";
import { questionHistory, TREND_LOOKBACK_DAYS } from "./history";
import { placeOf, readHistory, readLastScan } from "./reads/dal";
import { editMakesNewQuestion, questionsView, sameQuestion, tidyQuestion, type QuestionsView } from "./service";

/** From the page's link: only the questions whose answers used this site, or named this business and not you. */
export type QuestionsFocus = { site?: string | null; named?: string | null; ai?: string | null };

const FREQUENCIES: readonly string[] = ["daily", "weekly", "monthly"] satisfies ScanFrequency[];
const isModel = (m: string): m is ProviderId => m in CHECK_MODELS;

/** The Questions page for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getQuestionsPage(businessId: string, next: string, focus: QuestionsFocus = {}): Promise<QuestionsView | null> {
  const { agency } = await requireAgency({ next });
  return loadQuestionsPage(agency.id, businessId, new Date(), focus);
}

// Callers check the user may see this agency first.
export async function loadQuestionsPage(agencyId: string, businessId: string, now: Date, focus: QuestionsFocus = {}): Promise<QuestionsView | null> {
  const db = createServiceClient();
  const [business, questions] = await Promise.all([
    db
      .from("businesses")
      .select("id, name, domain, models, scan_frequency, primary_city, primary_region, industry")
      .eq("id", businessId)
      .eq("agency_id", agencyId)
      .maybeSingle(),
    // A removed question is kept for past scores (step 9e) but never listed again.
    db
      .from("tracked_prompts")
      .select("id, prompt, active, source, category, created_at")
      .eq("business_id", businessId)
      .is("removed_at", null)
      .order("created_at")
      .order("id"),
  ]);
  for (const r of [business, questions]) if (r.error) throw new Error(`Questions: ${r.error.message}`);
  if (!business.data) return null;

  const models = business.data.models.filter(isModel);
  const records = questions.data!.map(({ source, category, created_at, ...q }) => ({
    ...q,
    own: isOwnQuestion(source),
    topic: category,
    createdAt: created_at,
  }));
  // A link from Compare counts what Compare counts: the suggested questions in the score, not your own or paused ones.
  const scored = new Map(records.filter((q) => q.active && !q.own).map((q) => [q.id, q.prompt]));
  const [history, limit, standing, lastScan, focusAnswers] = await Promise.all([
    // The pips, the 30-day rate and the change since the scan before, from the same saved checks as the score.
    readHistory(businessId, now, TREND_LOOKBACK_DAYS),
    maxQuestions(businessId),
    // Saved answers only: who AI named on each question and the sites it used without you.
    loadStanding(agencyId, businessId, now),
    // Checks the last scan could not do, so the page never calls them "not checked yet" (BUG-074).
    readLastScan(businessId, models, records),
    // "See the answers" from Compare: the answers the link is about, shown above the list.
    readFocusAnswers(businessId, models, scored, focus, now, {
      ownDomain: business.data.domain,
      place: placeOf(business.data.primary_city, business.data.primary_region),
    }),
  ]);
  const answered = standing ? [...standing.checks, ...standing.ownChecks] : [];
  const summaries = standing ? questionSummaries(answered, standing.you.domain, standing.competitors) : undefined;
  return questionsView({
    businessId,
    businessName: business.data.name,
    city: business.data.primary_city,
    industry: business.data.industry,
    models,
    frequency: FREQUENCIES.includes(business.data.scan_frequency) ? (business.data.scan_frequency as ScanFrequency) : "weekly",
    questions: records,
    history: questionHistory(history, { now, models }),
    limit: limit.limit,
    summaries,
    matching: focusMatches(standing?.checks ?? [], focus),
    focusAnswers,
    lastScan,
    // Where AI listed each business stays hidden until decided (D-63).
    showPositions: env.SHOW_POSITION === "true",
  });
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
    .select("id, prompt, active, source, category")
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
export async function updateQuestionText(
  agencyId: string,
  businessId: string,
  questionId: string,
  text: string,
  /** The topic tag; undefined keeps the saved one, null clears it. */
  topic?: string | null,
): Promise<EditResult> {
  const owned = await ownedQuestions(agencyId, businessId);
  const question = owned?.questions.find((q) => q.id === questionId);
  if (!owned || !question) return notFound;
  const prompt = tidyQuestion(text);
  const category = topic === undefined ? question.category : topic;
  if (question.prompt === prompt) {
    // Only the topic changed: a tag, not the question, so it never starts a new one.
    if (category !== question.category) {
      const { error } = await createServiceClient().from("tracked_prompts").update({ category }).eq("id", questionId).eq("business_id", businessId);
      if (error) throw new Error(`Questions: could not save the topic: ${error.message}`);
    }
    return { ok: true, newQuestion: false };
  }
  if (owned.questions.some((q) => q.id !== questionId && sameQuestion(q.prompt, prompt))) return duplicate;
  const db = createServiceClient();
  if (!editMakesNewQuestion({ custom: isOwnQuestion(question.source), answered: await hasAnswers(questionId) })) {
    const { error } = await db.from("tracked_prompts").update({ prompt, source: "custom", category }).eq("id", questionId).eq("business_id", businessId);
    if (error) throw new Error(`Questions: could not save the question: ${error.message}`);
    return { ok: true, newQuestion: false };
  }
  const { data: added, error } = await db
    .from("tracked_prompts")
    .insert({ business_id: businessId, prompt, source: "custom", active: question.active, category })
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
