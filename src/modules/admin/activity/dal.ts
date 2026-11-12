import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/modules/auth";
import { ADMIN_PAGE_SIZE } from "../schema";
import { emailsOf, inChunks, unique } from "../businesses/dal";
import { actionLabel, reasonOf, targetHref, type ActivityQuery } from "./service";

export type ActivityOutcome = "done" | "failed" | "started";

export type ActivityRow = {
  id: string;
  label: string;
  /** The admin's email, or "Stripe" for changes made by a Stripe webhook. */
  by: string;
  target: { name: string | null; href: string | null; kind: string | null };
  reason: string | null;
  outcome: ActivityOutcome;
  at: string;
};

export type ActivityList = { rows: ActivityRow[]; total: number; page: number; pages: number };

/** One page of the admin action history, newest first: every agency, business, scan, alert, lead and request. */
export async function listAdminActivity(query: ActivityQuery): Promise<ActivityList> {
  await requireAdmin();
  const db = createServiceClient();
  let list = db
    .from("admin_audit_log")
    .select("id, action, target_type, target_id, details, admin_user_id, created_at, outcome", { count: "exact" });
  if (query.area) list = list.like("action", `${query.area}.%`);
  // "Only problems": a change that did not go through, or whose result was never confirmed (BUG-278).
  if (query.failed) list = list.neq("outcome", "done");
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, error, count } = await list.order("created_at", { ascending: false }).order("id").range(from, from + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`Admin activity: ${error.message}`);

  const ids = (type: string) => unique(data.filter((r) => r.target_type === type).map((r) => r.target_id));
  const [emails, agencies, businesses] = await Promise.all([
    emailsOf(unique(data.map((r) => r.admin_user_id))),
    names("agencies", ids("agency")),
    names("businesses", ids("business")),
  ]);

  const rows = data.map((r): ActivityRow => {
    const name = r.target_type === "agency" ? agencies.get(r.target_id ?? "") : r.target_type === "business" ? businesses.get(r.target_id ?? "") : undefined;
    return {
      id: r.id,
      label: actionLabel(r.action),
      // Only Stripe webhooks write without an admin; any other row lost its admin when that account was deleted.
      by: r.action.startsWith("stripe.") ? "Stripe" : r.admin_user_id ? (emails.get(r.admin_user_id) ?? "A removed admin") : "A removed admin",
      target: { name: name ?? null, href: name ? targetHref(r.target_type, r.target_id) : null, kind: r.target_type },
      reason: reasonOf(r.details),
      outcome: (r.outcome as ActivityOutcome) ?? "done",
      at: r.created_at,
    };
  });
  const total = count ?? 0;
  return { rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

async function names(table: "agencies" | "businesses", ids: string[]): Promise<Map<string, string>> {
  const rows = await inChunks(ids, async (chunk) => {
    const { data, error } = await createServiceClient().from(table).select("id, name").in("id", chunk);
    if (error) throw new Error(`Admin activity: ${error.message}`);
    return data;
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}
