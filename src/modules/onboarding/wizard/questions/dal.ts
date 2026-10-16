import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maxQuestions } from "@/modules/entitlements";
import { liveQuestionClients } from "../../dal";
import { cityLabel } from "../../question-rules";
import { placeTypesOf, prepareQuestions, type QuestionClients } from "../../questions";
import { FINISHED_STEP, nextStepNumber, type PlanId } from "../steps";
import { ownDraftStep, ownStep } from "../dal";

// Used when the plan sets no limit (Enterprise): MVP_SPEC 3.1 step 6 caps questions at 25.
const QUESTION_CAP = 25;

export type QuestionsStep = {
  businessName: string;
  questions: string[];
  limit: number;
  /** The suggestions were rebuilt for new business details (Back to the details step): said once, until saved. */
  updated: boolean;
};

/**
 * Step 6. The first visit prepares 12 questions and saves them at once, so a refresh or a return never
 * asks Claude again. Library candidates (B-33) need no extra record: they are exactly the businesses
 * whose industry has no active question_library templates.
 */
export async function loadQuestionsStep(
  userId: string,
  businessId: string,
  clients: QuestionClients = liveQuestionClients({ accountUserId: userId, businessId }),
): Promise<QuestionsStep | null | "no-city"> {
  const supabase = await createClient();
  const { data: b, error } = await supabase
    .from("businesses")
    .select("name, aliases, domain, industry, services, description, primary_city, primary_region, primary_area, places_id, is_chain, questions_updated_at")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b) return null;
  if (!b.primary_city) return "no-city";

  const [rows, limit, rivals] = await Promise.all([
    activeQuestions(businessId),
    questionLimit(businessId),
    supabase.from("business_competitors").select("name, aliases").eq("business_id", businessId),
  ]);
  if (rows.length > 0) {
    return { businessName: b.name, questions: rows.map((r) => r.prompt), limit, updated: b.questions_updated_at !== null };
  }

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
      competitors: (rivals.data ?? []).flatMap((c) => [c.name, ...(c.aliases ?? [])]),
      chain: b.is_chain,
      // Google's types, read live (D-73): a fast food listing gets fast food questions.
      ...(await placeTypesOf(b.places_id, clients)),
    },
    clients,
  );
  if (set.error) console.warn(`Question picking fell back (${set.source}): ${set.error}`);
  // tracked_prompts.source allows library, custom or legacy, and custom means the user wrote it. Questions
  // Claude wrote or the fallback made are our suggestions too, so they are stored as library (BUG-9).
  const source = "library";
  const location = cityLabel(b.primary_city, b.primary_region);
  const now = Date.now();
  // Two loads at once (a refresh, a second tab) each prepare a set; the business row lock in
  // save_first_questions keeps the first saved one and hands it to the other load too.
  const { data: saved, error: saveError } = await createServiceClient().rpc("save_first_questions", {
    p_business_id: businessId,
    p_owner_user_id: userId,
    p_questions: set.questions.map((q, i) => ({
      prompt: q.text,
      buyer_intent: q.intent,
      location,
      source,
      created_at: inOrder(i, now),
    })),
  });
  if (saveError) throw new Error(`Could not save questions: ${saveError.message}`);
  return { businessName: b.name, questions: saved.map((r) => r.prompt), limit, updated: false };
}

// Rows saved in one insert share a timestamp, so each gets its own to keep the list in order.
const inOrder = (i: number, from = Date.now()) => new Date(from + i).toISOString();

async function activeQuestions(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracked_prompts")
    .select("id, prompt")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("created_at")
    .order("id");
  if (error) throw new Error(`Could not load questions: ${error.message}`);
  return data;
}

async function questionLimit(businessId: string): Promise<number> {
  return (await maxQuestions(businessId)).limit ?? QUESTION_CAP;
}

export type SaveQuestionsResult = { ok: true; count: number } | { ok: false; status: 403 | 404; error: string };

/** Keeps questions the user left alone (and how they were made), removes the rest, adds the new ones. */
export async function saveQuestions(userId: string, businessId: string, questions: string[]): Promise<SaveQuestionsResult> {
  // Drafts only: a live business's questions change on the Questions page, where an ended plan is read-only.
  const current = await ownDraftStep(userId, businessId);
  if (current === undefined) return { ok: false, status: 404, error: "Business not found." };
  const unique = [...new Map(questions.map((q) => [q.trim().toLowerCase(), q.trim()])).values()];
  const limit = await questionLimit(businessId);
  if (unique.length > limit) return { ok: false, status: 403, error: `Your plan checks up to ${limit} questions.` };

  const rows = await activeQuestions(businessId);
  const wanted = new Set(unique.map((q) => q.toLowerCase()));
  const kept = new Set(rows.map((r) => r.prompt.toLowerCase()));
  const remove = rows.filter((r) => !wanted.has(r.prompt.toLowerCase())).map((r) => r.id);
  const add = unique.filter((q) => !kept.has(q.toLowerCase()));

  if (remove.length) {
    // Removed, not deleted: a question asked before keeps its answers for past scores (step 9e).
    const { error } = await createServiceClient()
      .from("tracked_prompts")
      .update({ active: false, removed_at: new Date().toISOString() })
      .in("id", remove)
      .eq("business_id", businessId);
    if (error) throw new Error(`Could not remove questions: ${error.message}`);
  }
  if (add.length) {
    const { error } = await createServiceClient()
      .from("tracked_prompts")
      .insert(add.map((prompt, i) => ({ business_id: businessId, prompt, source: "custom", active: true, created_at: inOrder(i) })));
    if (error) throw new Error(`Could not add questions: ${error.message}`);
    await dropRepeats(businessId);
  }
  const { error } = await createServiceClient()
    .from("businesses")
    // Saved: the "we updated your questions" notice has been seen.
    .update({ onboarding_step: nextStepNumber(current, "questions"), questions_updated_at: null })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save progress: ${error.message}`);
  return { ok: true, count: unique.length };
}

/**
 * Two saves at once (a second tab) each add the same new question. tracked_prompts has no unique text index, so the
 * later copies are deleted: the first by created_at then id, the same choice in every save. A draft has no answers.
 */
async function dropRepeats(businessId: string): Promise<void> {
  const seen = new Set<string>();
  const repeats = (await activeQuestions(businessId)).filter((r) => {
    const key = r.prompt.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  if (!repeats.length) return;
  const { error } = await createServiceClient().from("tracked_prompts").delete().in("id", repeats.map((r) => r.id)).eq("business_id", businessId);
  if (error) throw new Error(`Could not remove repeated questions: ${error.message}`);
}

export type ModelsStep = {
  models: string[];
  frequency: string;
  activeQuestions: number;
  plan: { name: string; monthlyCredits: number | null } | null;
};

/** Step 7. The plan is the one picked on the pricing page, else Starter, as in entitlements. */
export async function loadModelsStep(userId: string, businessId: string, plan: PlanId | null): Promise<ModelsStep | null> {
  const supabase = await createClient();
  const { data: b, error } = await supabase
    .from("businesses")
    .select("models, scan_frequency")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b) return null;
  const [rows, planRow] = await Promise.all([
    activeQuestions(businessId),
    supabase.from("plans").select("name, monthly_credits").eq("id", plan ?? "starter").maybeSingle(),
  ]);
  if (planRow.error) throw new Error(`Could not load plan: ${planRow.error.message}`);
  return {
    models: b.models,
    frequency: b.scan_frequency,
    activeQuestions: rows.length,
    plan: planRow.data && { name: planRow.data.name, monthlyCredits: planRow.data.monthly_credits },
  };
}

/** Step 7 saved when the card step still follows: the business stays a draft, now at step 8. */
export async function saveModels(userId: string, businessId: string, models: string[], frequency: string): Promise<boolean> {
  const current = await ownDraftStep(userId, businessId);
  if (current === undefined) return false;
  const { error } = await createServiceClient()
    .from("businesses")
    .update({ models, scan_frequency: frequency, onboarding_step: nextStepNumber(current, "models") })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save AI checks: ${error.message}`);
  return true;
}

/**
 * The last step saved: the business is set up. It becomes the one the dashboard shows. Any of the user's businesses,
 * not only a draft, so a card step polled again after it finished still answers; the models step checks the draft.
 */
export async function finishWizard(userId: string, businessId: string, checks?: { models: string[]; frequency: string }): Promise<boolean> {
  if ((await ownStep(userId, businessId)) === undefined) return false;
  const supabase = await createClient();
  const { error } = await createServiceClient()
    .from("businesses")
    .update({
      ...(checks ? { models: checks.models, scan_frequency: checks.frequency } : {}),
      onboarding_step: FINISHED_STEP,
      status: "active",
    })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save AI checks: ${error.message}`);
  const { error: profileError } = await supabase.from("profiles").update({ active_business_id: businessId }).eq("id", userId);
  if (profileError) throw new Error(`Could not switch business: ${profileError.message}`);
  return true;
}

/** The plan picked on the pricing page, kept in app_metadata by the agency step. */
export async function selectedPlan(userId: string): Promise<PlanId | null> {
  const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
  if (error) throw new Error(`Could not load user: ${error.message}`);
  const plan = data.user.app_metadata?.selected_plan;
  return plan === "starter" || plan === "pro" ? plan : null;
}
