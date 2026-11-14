"use server";

import { authFailure, requireUser, type ActionResult } from "@/modules/auth";
import { checkRateLimit } from "@/modules/rate-limit";
import { saveFeatureRequest } from "./dal";
import { featureRequestInput } from "./schema";
import { featureRequestProblem } from "./service";

const NOT_SENT = "Your idea wasn't sent. Try again in a moment.";

// "Suggest a feature" from a signed-in user. Was POST /api/geo/feature-requests, the last route on the old path.
export async function suggestFeature(input: unknown): Promise<ActionResult<null>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = featureRequestInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Something was wrong with that request. Refresh the page and try again." };
  const problem = featureRequestProblem(parsed.data);
  if (problem) return { ok: false, status: 400, error: problem };
  // Per user, so one account can't fill the admin list (SEC-07).
  const limit = await checkRateLimit("feature_request", userId);
  if (limit === "limited") return { ok: false, status: 429, error: "You've sent a lot of ideas this hour. Thanks! Try again later." };
  if (limit === "unavailable") return { ok: false, status: 503, error: NOT_SENT };
  if (!(await saveFeatureRequest(userId, parsed.data)).ok) return { ok: false, status: 500, error: NOT_SENT };
  return { ok: true, data: null };
}
