"use server";

import { z } from "zod";
import { requireAdminPassword } from "../dal";
import { authFailure, type ActionResult } from "../errors";
import { startAppEnrollment, verifyAppCode, verifiedAppFactor } from "./dal";

// The admin "Verify it's you" page (ADMIN_REQUIRE_MFA). Both need an admin signed in with a password; neither needs
// the code yet, since this is where it is entered.

const codeInput = z.object({
  factorId: z.string().trim().min(1).max(100),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your app."),
});

export async function startAdminAppSetup(): Promise<ActionResult<{ factorId: string; qrCode: string; secret: string }>> {
  try {
    await requireAdminPassword();
    // An app that is already set up is used as it is, so a second tab cannot replace it.
    if (await verifiedAppFactor()) return { ok: false, status: 409, error: "An authenticator app is already set up. Enter its code instead." };
    const enrollment = await startAppEnrollment();
    if (!enrollment.ok) return { ok: false, status: 503, error: enrollment.error };
    return { ok: true, data: { factorId: enrollment.factorId, qrCode: enrollment.qrCode, secret: enrollment.secret } };
  } catch (error) {
    return authFailure(error);
  }
}

export async function verifyAdminCode(input: unknown): Promise<ActionResult<{ verified: true }>> {
  try {
    await requireAdminPassword();
    const parsed = codeInput.safeParse(input);
    if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code from your app.", field: "code" };
    if (!(await verifyAppCode(parsed.data.factorId, parsed.data.code))) {
      return { ok: false, status: 400, error: "That code didn't work. Codes change every 30 seconds, so enter the newest one.", field: "code" };
    }
    return { ok: true, data: { verified: true } };
  } catch (error) {
    return authFailure(error);
  }
}
