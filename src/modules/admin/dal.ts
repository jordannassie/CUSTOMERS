import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { adminActionInput, type AdminActionDetails, type AdminTarget } from "./schema";

/**
 * What an audited change reports back. `result` goes to the caller as is. `changed` says whether anything changed:
 * when it did not (a refusal found in the same step, such as a status that moved on meanwhile), the history row is
 * marked failed with `reason` instead of done.
 */
export type AuditedResult<T> =
  | { changed: true; result: T; details?: AdminActionDetails }
  | { changed: false; result: T; reason: string };

/** The change went through; `details` (a new id, the dates it set) are added to the history row. */
export function changed<T>(result: T, details?: AdminActionDetails): AuditedResult<T> {
  return { changed: true, result, details };
}

/** Nothing changed; `reason` is a short note for the history row. */
export function unchanged<T>(result: T, reason: string): AuditedResult<T> {
  return { changed: false, result, reason };
}

/**
 * Thrown by a change that failed after part of it went through (Stripe accepted, the save after it did not). The
 * history row stays 'started' ("result not confirmed") with the error, never 'failed', since something did change.
 */
export class PartialChangeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PartialChangeError";
  }
}

function errorText(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

/**
 * Runs an admin change with its history row written first (MVP_SPEC 9.1, BUG-278). The row starts as 'started'; if it
 * cannot be written the change never runs. It ends as 'done' (with the change's extra details), or 'failed' with the
 * error or the reason nothing changed. If that last update fails the row stays 'started', which still records that
 * the change may have happened. Put the admin's reason in `details.reason` when the action asks for one.
 */
export async function auditedChange<T>(
  action: string,
  target: AdminTarget,
  details: AdminActionDetails,
  change: () => Promise<AuditedResult<T>>,
): Promise<T> {
  const admin = await requireAdmin();
  const input = adminActionInput.parse({ action, target, details });

  // Signed-in users have no access to admin_audit_log, so the writes use the service role.
  const db = createServiceClient();
  const { data: row, error } = await db
    .from("admin_audit_log")
    .insert({
      admin_user_id: admin.id,
      action: input.action,
      target_type: input.target.type,
      target_id: input.target.id,
      details: input.details,
      outcome: "started",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not write admin audit log: ${error.message}`);

  const finish = async (outcome: "started" | "done" | "failed", extra: AdminActionDetails) => {
    const finishedAt = outcome === "started" ? null : new Date().toISOString();
    const { error: updateError } = await db
      .from("admin_audit_log")
      .update({ outcome, finished_at: finishedAt, details: { ...input.details, ...extra } })
      .eq("id", row.id);
    if (updateError) console.error(`[admin] could not mark audit row ${row.id} ${outcome}:`, updateError.message);
  };

  let outcome: AuditedResult<T>;
  try {
    outcome = await change();
  } catch (changeError) {
    const outcome = changeError instanceof PartialChangeError ? "started" : "failed";
    await finish(outcome, { error: errorText(changeError) }).catch((e) => console.error("[admin] audit update failed:", e));
    throw changeError;
  }
  await finish(outcome.changed ? "done" : "failed", outcome.changed ? (outcome.details ?? {}) : { error: outcome.reason }).catch(
    (e) => console.error("[admin] audit update failed:", e),
  );
  return outcome.result;
}
