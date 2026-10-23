import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { adminActionInput, type AdminActionDetails, type AdminTarget } from "./schema";

/**
 * Records who did what to which target (MVP_SPEC 9.1). Every admin mutation calls this after it
 * succeeds; put the admin's reason in `details.reason` when the action asks for one.
 */
export async function logAdminAction(
  action: string,
  target: AdminTarget,
  details: AdminActionDetails = {},
): Promise<void> {
  const admin = await requireAdmin();
  const input = adminActionInput.parse({ action, target, details });

  // Signed-in users have no access to admin_audit_log, so the write uses the service role.
  const { error } = await createServiceClient().from("admin_audit_log").insert({
    admin_user_id: admin.id,
    action: input.action,
    target_type: input.target.type,
    target_id: input.target.id,
    details: input.details,
  });
  if (error) throw new Error(`Could not write admin audit log: ${error.message}`);
}
