"use server";

import { revalidatePath } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canEditTracking } from "@/modules/entitlements";
import { addAction, assignAction, moveAction } from "./board/dal";
import type { ActionState, ActionStatus } from "./board/service";
import { updateChecklistItem, updateStatus } from "./dal";
import { ADDED_ACTIONS_FULL, addActionInput, assignActionInput, moveActionInput, setChecklistInput, setStatusInput } from "./schema";
import type { Status } from "./service";

const PAGE = "/actions";
// The board and the checklist show a change at once and keep it (board-overrides.ts, open-count.ts), so the Actions
// page is not rendered again for it. Revalidating the Overview instead still makes every page visited before, Actions
// included, load fresh when opened again (Next.js 16 revalidatePath).
const OTHER_PAGES = "/dashboard";

type Denied = { denied: ActionResult<never> };

/**
 * The signed-in agency and user, when the agency may change its fixes. An ended plan is read-only (MVP_SPEC 4.4), as on
 * Questions, Competitors and Settings: fixes can be read but not moved, added, assigned or ticked.
 */
async function guard(): Promise<{ agencyId: string; userId: string } | Denied> {
  try {
    const { agency, user } = await requireAgency();
    const edit = canEditTracking(agency);
    if (!edit.allowed) return { denied: { ok: false, status: 403, error: edit.reason } };
    return { agencyId: agency.id, userId: user.id };
  } catch (error) {
    return { denied: authFailure(error) };
  }
}

export async function setOpportunityStatus(input: unknown): Promise<ActionResult<{ status: Status }>> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const { agencyId } = auth;
  const parsed = setStatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "That change could not be saved. Reload the page and try again." };

  const { businessId, opportunityId, status } = parsed.data;
  if (!(await updateStatus(agencyId, businessId, opportunityId, status))) {
    return { ok: false, status: 404, error: "We could not find that fix. Reload the page and try again." };
  }
  revalidatePath(OTHER_PAGES);
  return { ok: true, data: { status } };
}

export async function setChecklistItem(input: unknown): Promise<ActionResult<{ done: boolean }>> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const { agencyId } = auth;
  const parsed = setChecklistInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "That change could not be saved. Reload the page and try again." };

  const { businessId, key, done } = parsed.data;
  if (!(await updateChecklistItem(agencyId, businessId, key, done))) {
    return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
  }
  revalidatePath(OTHER_PAGES);
  return { ok: true, data: { done } };
}

const AGAIN = "That change could not be saved. Reload the page and try again.";

/** "Add to Actions": adds the fix in To do, or returns the one already added. */
export async function addToActions(input: unknown): Promise<ActionResult<ActionState>> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const { agencyId } = auth;
  const parsed = addActionInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "That fix could not be added. Reload the page and try again." };
  const { businessId, ...action } = parsed.data;
  const state = await addAction(agencyId, businessId, action);
  if (!state) return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
  if (state === "full") return { ok: false, status: 409, error: ADDED_ACTIONS_FULL };
  revalidatePath(PAGE);
  return { ok: true, data: state };
}

/** Moves a card to another column. */
export async function moveActionTo(input: unknown): Promise<ActionResult<{ status: ActionStatus }>> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const { agencyId } = auth;
  const parsed = moveActionInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: AGAIN };
  const { businessId, actionId, status } = parsed.data;
  if (!(await moveAction(agencyId, businessId, actionId, status))) {
    return { ok: false, status: 404, error: "We could not find that fix. Reload the page and try again." };
  }
  revalidatePath(OTHER_PAGES);
  return { ok: true, data: { status } };
}

/** Assigns a fix to the signed-in user, or clears it. */
export async function assignActionToMe(input: unknown): Promise<ActionResult<{ toMe: boolean }>> {
  const ids = await guard();
  if ("denied" in ids) return ids.denied;
  const parsed = assignActionInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: AGAIN };
  const { businessId, actionId, toMe } = parsed.data;
  if (!(await assignAction(ids.agencyId, businessId, actionId, toMe ? ids.userId : null))) {
    return { ok: false, status: 404, error: "We could not find that fix. Reload the page and try again." };
  }
  revalidatePath(OTHER_PAGES);
  return { ok: true, data: { toMe } };
}
