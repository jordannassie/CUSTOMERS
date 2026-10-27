"use server";

import { revalidatePath } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { addAction, assignAction, moveAction } from "./board/dal";
import type { ActionState, ActionStatus } from "./board/service";
import { updateChecklistItem, updateStatus } from "./dal";
import { addActionInput, assignActionInput, moveActionInput, setChecklistInput, setStatusInput } from "./schema";
import type { Status } from "./service";

const PAGE = "/actions";

export async function setOpportunityStatus(input: unknown): Promise<ActionResult<{ status: Status }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = setStatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "That change could not be saved. Reload the page and try again." };

  const { businessId, opportunityId, status } = parsed.data;
  if (!(await updateStatus(agencyId, businessId, opportunityId, status))) {
    return { ok: false, status: 404, error: "We could not find that fix. Reload the page and try again." };
  }
  revalidatePath(PAGE);
  revalidatePath("/dashboard");
  return { ok: true, data: { status } };
}

export async function setChecklistItem(input: unknown): Promise<ActionResult<{ done: boolean }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = setChecklistInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "That change could not be saved. Reload the page and try again." };

  const { businessId, key, done } = parsed.data;
  if (!(await updateChecklistItem(agencyId, businessId, key, done))) {
    return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
  }
  revalidatePath(PAGE);
  return { ok: true, data: { done } };
}

const AGAIN = "That change could not be saved. Reload the page and try again.";

/** "Add to Actions": adds the fix in To do, or returns the one already added. */
export async function addToActions(input: unknown): Promise<ActionResult<ActionState>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = addActionInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "That fix could not be added. Reload the page and try again." };
  const { businessId, ...action } = parsed.data;
  const state = await addAction(agencyId, businessId, action);
  if (!state) return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
  revalidatePath(PAGE);
  return { ok: true, data: state };
}

/** Moves a card to another column. */
export async function moveActionTo(input: unknown): Promise<ActionResult<{ status: ActionStatus }>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = moveActionInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: AGAIN };
  const { businessId, actionId, status } = parsed.data;
  if (!(await moveAction(agencyId, businessId, actionId, status))) {
    return { ok: false, status: 404, error: "We could not find that fix. Reload the page and try again." };
  }
  revalidatePath(PAGE);
  revalidatePath("/dashboard");
  return { ok: true, data: { status } };
}

/** Assigns a fix to the signed-in user, or clears it. */
export async function assignActionToMe(input: unknown): Promise<ActionResult<{ toMe: boolean }>> {
  let ids: { agencyId: string; userId: string };
  try {
    const { agency, user } = await requireAgency();
    ids = { agencyId: agency.id, userId: user.id };
  } catch (error) {
    return authFailure(error);
  }
  const parsed = assignActionInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: AGAIN };
  const { businessId, actionId, toMe } = parsed.data;
  if (!(await assignAction(ids.agencyId, businessId, actionId, toMe ? ids.userId : null))) {
    return { ok: false, status: 404, error: "We could not find that fix. Reload the page and try again." };
  }
  revalidatePath(PAGE);
  return { ok: true, data: { toMe } };
}
