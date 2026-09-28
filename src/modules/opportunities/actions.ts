"use server";

import { revalidatePath } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { updateChecklistItem, updateStatus } from "./dal";
import { setChecklistInput, setStatusInput } from "./schema";
import type { Status } from "./service";

const PAGE = "/opportunities";

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
