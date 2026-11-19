import "server-only";
import { maxQuestions } from "@/modules/entitlements";
import { createServiceClient } from "@/lib/supabase/service";
import { duplicate, notFound, type ChangeFailure, type ChangeResult } from "../results";

// Adding or resuming a question under the plan limit (BUG-279). The limit (the plan, or the plan chosen during setup)
// is worked out here; the write runs in SQL after a lock on the business row (migration 085), so two quick clicks
// cannot both see room for one more. Callers check the business is the agency's first.

type RpcError = { code?: string; message: string };

/** The plan's limit message, read again once the database says the business is full. */
async function limitFailure(businessId: string, max: number): Promise<ChangeFailure> {
  const limit = await maxQuestions(businessId);
  const error = limit.allowed ? `Your plan includes ${max} questions per business. Upgrade or remove one to add another.` : limit.reason;
  return { ok: false, status: 403, error };
}

async function outcome(error: RpcError | null, businessId: string, max: number | null, action: string): Promise<ChangeResult> {
  if (!error) return { ok: true };
  if (error.message.includes("question_limit")) return limitFailure(businessId, max ?? 0);
  if (error.message.includes("duplicate_question")) return duplicate;
  if (error.message.includes("business_not_found")) return notFound;
  throw new Error(`Questions: could not ${action} the question: ${error.message}`);
}

export async function addUnderLimit(agencyId: string, businessId: string, prompt: string): Promise<ChangeResult> {
  const limit = await maxQuestions(businessId);
  if (!limit.allowed) return { ok: false, status: 403, error: limit.reason };
  const { error } = await createServiceClient().rpc("add_tracked_question", {
    p_business_id: businessId,
    p_agency_id: agencyId,
    p_prompt: prompt,
    p_max: limit.limit ?? undefined,
  });
  return outcome(error, businessId, limit.limit, "add");
}

export async function resumeUnderLimit(agencyId: string, businessId: string, questionId: string): Promise<ChangeResult> {
  const limit = await maxQuestions(businessId);
  if (!limit.allowed) return { ok: false, status: 403, error: limit.reason };
  const { error } = await createServiceClient().rpc("resume_tracked_question", {
    p_business_id: businessId,
    p_agency_id: agencyId,
    p_question_id: questionId,
    p_max: limit.limit ?? undefined,
  });
  return outcome(error, businessId, limit.limit, "resume");
}
