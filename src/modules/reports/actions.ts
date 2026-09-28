"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { createShare, revokeShare, type ShareLink } from "./dal";
import { createShareLinkInput, revokeShareLinkInput } from "./schema";

export async function createShareLink(input: unknown): Promise<ActionResult<ShareLink>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = createShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be created. Reload the page and try again." };

  const link = await createShare(agencyId, parsed.data.businessId);
  if (!link) return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
  return { ok: true, data: link };
}

export async function revokeShareLink(input: unknown): Promise<ActionResult<null>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = revokeShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be turned off. Reload the page and try again." };

  if (!(await revokeShare(agencyId, parsed.data.id))) {
    return { ok: false, status: 404, error: "We could not find that link. Reload the page and try again." };
  }
  return { ok: true, data: null };
}
