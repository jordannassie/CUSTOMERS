"use server";

import { refresh } from "next/cache";
import { authFailure, requireAdmin, type ActionResult } from "@/modules/auth";
import { auditedChange, changed, unchanged } from "../dal";
import { markAlertResolved } from "./dal";
import { resolveAlertInput } from "./schema";

/** "Resolve" on an open alert (B-69): needs a reason, which goes into the history row written before the change (BUG-278). */
export async function resolveAlert(input: unknown): Promise<ActionResult<{ alertId: string }>> {
  try {
    await requireAdmin();
    const parsed = resolveAlertInput.safeParse(input);
    if (!parsed.success) return { ok: false, status: 400, error: "Add a reason of at least 3 characters." };
    const { alertId, reason } = parsed.data;

    const result = await auditedChange<ActionResult<{ alertId: string }>>(
      "system_alert.resolve",
      { type: "system_alert", id: alertId },
      { reason },
      async () => {
        const resolved = await markAlertResolved(alertId);
        if (!resolved) {
          return unchanged({ ok: false, status: 409, error: "This alert is already resolved. Refresh to see the latest list." }, "already resolved");
        }
        return changed({ ok: true, data: { alertId } }, { kind: resolved.kind, message: resolved.message });
      },
    );
    if (result.ok) refresh();
    return result;
  } catch (error) {
    return authFailure(error);
  }
}
