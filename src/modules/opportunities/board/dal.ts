import "server-only";
// The Actions board's reads and writes (dashboard redesign, 2026-10-27). Reads go through insights, which fills in
// Google values live (D-73); writes check the business is the agency's first, and never touch the scan's own fields.
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { getLiveOpportunities } from "@/modules/insights";
import { actionRow, statusUpdate, toActionItems, toActionStatus, type ActionItem, type ActionState, type ActionStatus, type NewAction } from "./service";

/**
 * Every action of one of the agency's businesses; null when it is not theirs. `google`: fill in Google's values,
 * which costs a Places call per place; off unless the owner pressed "Show Google numbers" (2026-10-27).
 */
export async function getActionsBoard(businessId: string, { google = false }: { google?: boolean } = {}): Promise<{ items: ActionItem[] } | null> {
  const { user } = await requireAgency({ next: "/actions" });
  const db = createServiceClient();
  const [live, rivals] = await Promise.all([
    getLiveOpportunities(businessId, undefined, { google }),
    db.from("business_competitors").select("id, name").eq("business_id", businessId).order("created_at"),
  ]);
  if (rivals.error) throw new Error(`Actions: could not read competitors: ${rivals.error.message}`);
  if (!live) return null;
  return { items: toActionItems(live, rivals.data, user.id) };
}

async function ownsBusiness(agencyId: string, businessId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("businesses").select("id").eq("id", businessId).eq("agency_id", agencyId).maybeSingle();
  if (error) throw new Error(`Actions: could not read the business: ${error.message}`);
  return data !== null;
}

/**
 * Adds a fix, or finds the one already added with the same key (a second click, another tab). Null when the business
 * is not the agency's.
 */
export async function addAction(agencyId: string, businessId: string, action: NewAction): Promise<ActionState | null> {
  if (!(await ownsBusiness(agencyId, businessId))) return null;
  const db = createServiceClient();
  const existing = await findByKey(businessId, action.dedupeKey);
  if (existing) return existing;
  const inserted = await db.from("opportunities").insert(actionRow(businessId, action)).select("id, status").single();
  if (!inserted.error) return { id: inserted.data.id, status: toActionStatus(inserted.data.status) };
  // Two clicks at once: the unique key let one in; return that one.
  if (inserted.error.code === "23505") {
    const again = await findByKey(businessId, action.dedupeKey);
    if (again) return again;
  }
  throw new Error(`Actions: could not add the fix: ${inserted.error.message}`);
}

async function findByKey(businessId: string, key: string): Promise<ActionState | null> {
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .select("id, status")
    .eq("business_id", businessId)
    .eq("dedupe_key", key)
    .maybeSingle();
  if (error) throw new Error(`Actions: could not look up the fix: ${error.message}`);
  return data ? { id: data.id, status: toActionStatus(data.status) } : null;
}

/** Which of these keys are already actions, and in which column ("In Actions · To do"). */
export async function actionStates(businessId: string, keys: string[]): Promise<Map<string, ActionState>> {
  const unique = [...new Set(keys)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .select("id, status, dedupe_key")
    .eq("business_id", businessId)
    .in("dedupe_key", unique);
  if (error) throw new Error(`Actions: could not read added fixes: ${error.message}`);
  return new Map(data.map((r) => [r.dedupe_key!, { id: r.id, status: toActionStatus(r.status) }]));
}

/** False when the action is not one of this agency's. */
export async function moveAction(agencyId: string, businessId: string, id: string, status: ActionStatus, now = new Date()): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .update(statusUpdate(status, now))
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id");
  if (error) throw new Error(`Actions: could not move the fix: ${error.message}`);
  return data.length > 0;
}

/** Assigns the fix to the signed-in user, or clears it. False when not the agency's. */
export async function assignAction(agencyId: string, businessId: string, id: string, userId: string | null): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .update({ assignee_id: userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id");
  if (error) throw new Error(`Actions: could not assign the fix: ${error.message}`);
  return data.length > 0;
}
