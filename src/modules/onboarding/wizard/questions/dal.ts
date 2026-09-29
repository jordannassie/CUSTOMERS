import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maxQuestions } from "@/modules/entitlements";
import { liveQuestionClients } from "../../dal";
import { cityLabel } from "../../question-rules";
import { prepareQuestions, type QuestionClients } from "../../questions";
import { FINISHED_STEP, nextStepNumber, type PlanId } from "../steps";
import { ownStep } from "../dal";

// Used when the plan sets no limit (Enterprise): MVP_SPEC 3.1 step 6 caps questions at 25.
const QUESTION_CAP = 25;

export type QuestionsStep = {
  businessName: string;
  questions: string[];
  limit: number;
};

/**
 * Step 6. The first visit prepares 12 questions and saves them at once, so a refresh or a return never
 * asks Claude again. Library candidates (B-33) need no extra record: they are exactly the businesses
 * whose industry has no active question_library templates.
 */
export async function loadQuestionsStep(
  userId: string,
  businessId: string,
  clients: QuestionClients = liveQuestionClients(),
): Promise<QuestionsStep | null | "no-city"> {
  const supabase = await createClient();
  const { data: b, error } = await supabase
    .from("businesses")
    .select("name, industry, services, description, primary_city, primary_region")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b) return null;
  if (!b.primary_city) return "no-city";

  const [rows, limit] = await Promise.all([activeQuestions(businessId), questionLimit(businessId)]);
  if (rows.length > 0) {
    return { businessName: b.name, questions: rows.map((r) => r.prompt), limit };
  }

  const set = await prepareQuestions(
    {
      industry: b.industry,
      industryText: b.industry ?? undefined,
      services: b.services,
      description: b.description ?? "",
      city: b.primary_city,
      region: b.primary_region,
    },
    clients,
  );
  if (set.error) console.warn(`Question picking fell back (${set.source}): ${set.error}`);
  // tracked_prompts.source allows library, custom or legacy, and custom means the user wrote it. Questions
  // Claude wrote or the fallback made are our suggestions too, so they are stored as library (BUG-9).
  const source = "library";
  const location = cityLabel(b.primary_city, b.primary_region);
  const now = Date.now();
  const { data: mine, error: insertError } = await supabase
    .from("tracked_prompts")
    .insert(
      set.questions.map((q, i) => ({
        business_id: businessId,
        prompt: q.text,
        buyer_intent: q.intent,
        location,
        source,
        active: true,
        created_at: inOrder(i, now),
      })),
    )
    .select("id");
  if (insertError) throw new Error(`Could not save questions: ${insertError.message}`);

  // Two loads at once (a refresh, a second tab) each prepare a set. The set holding the oldest row wins
  // and any other set removes itself, so the business keeps exactly one.
  const all = await activeQuestions(businessId, true);
  const ours = new Set(mine.map((r) => r.id));
  if (all.length > 0 && !ours.has(all[0].id)) {
    const { error } = await supabase.from("tracked_prompts").delete().in("id", [...ours]);
    if (error) throw new Error(`Could not remove duplicate questions: ${error.message}`);
    return { businessName: b.name, questions: all.filter((r) => !ours.has(r.id)).map((r) => r.prompt), limit };
  }
  return { businessName: b.name, questions: all.filter((r) => ours.has(r.id)).map((r) => r.prompt), limit };
}

// Rows saved in one insert share a timestamp, so each gets its own to keep the list in order.
const inOrder = (i: number, from = Date.now()) => new Date(from + i).toISOString();

async function activeQuestions(businessId: string, uncached = false) {
  const supabase = await createClient();
  let query = supabase.from("tracked_prompts").select("id, prompt").eq("business_id", businessId).eq("active", true);
  // An always-true filter gives the request its own URL, so Next's per-render fetch memo cannot serve it.
  if (uncached) query = query.not("id", "is", null);
  const { data, error } = await query.order("created_at").order("id");
  if (error) throw new Error(`Could not load questions: ${error.message}`);
  return data;
}

async function questionLimit(businessId: string): Promise<number> {
  return (await maxQuestions(businessId)).limit ?? QUESTION_CAP;
}

export type SaveQuestionsResult = { ok: true; count: number } | { ok: false; status: 403 | 404; error: string };

/** Keeps questions the user left alone (and how they were made), removes the rest, adds the new ones. */
export async function saveQuestions(userId: string, businessId: string, questions: string[]): Promise<SaveQuestionsResult> {
  const current = await ownStep(userId, businessId);
  if (current === undefined) return { ok: false, status: 404, error: "Business not found." };
  const unique = [...new Map(questions.map((q) => [q.trim().toLowerCase(), q.trim()])).values()];
  const limit = await questionLimit(businessId);
  if (unique.length > limit) return { ok: false, status: 403, error: `Your plan checks up to ${limit} questions.` };

  const supabase = await createClient();
  const rows = await activeQuestions(businessId);
  const wanted = new Set(unique.map((q) => q.toLowerCase()));
  const kept = new Set(rows.map((r) => r.prompt.toLowerCase()));
  const remove = rows.filter((r) => !wanted.has(r.prompt.toLowerCase())).map((r) => r.id);
  const add = unique.filter((q) => !kept.has(q.toLowerCase()));

  if (remove.length) {
    const { error } = await supabase.from("tracked_prompts").delete().in("id", remove);
    if (error) throw new Error(`Could not remove questions: ${error.message}`);
  }
  if (add.length) {
    const { error } = await supabase
      .from("tracked_prompts")
      .insert(add.map((prompt, i) => ({ business_id: businessId, prompt, source: "custom", active: true, created_at: inOrder(i) })));
    if (error) throw new Error(`Could not add questions: ${error.message}`);
  }
  const { error } = await supabase
    .from("businesses")
    .update({ onboarding_step: nextStepNumber(current, "questions") })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save progress: ${error.message}`);
  return { ok: true, count: unique.length };
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
  const current = await ownStep(userId, businessId);
  if (current === undefined) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ models, scan_frequency: frequency, onboarding_step: nextStepNumber(current, "models") })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(`Could not save AI checks: ${error.message}`);
  return true;
}

/** The last step saved: the business is set up. It becomes the one the dashboard shows. */
export async function finishWizard(userId: string, businessId: string, checks?: { models: string[]; frequency: string }): Promise<boolean> {
  if ((await ownStep(userId, businessId)) === undefined) return false;
  const supabase = await createClient();
  const { error } = await supabase
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
