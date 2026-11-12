import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/modules/auth";
import { readPage } from "../paging";
import { ADMIN_PAGE_SIZE } from "../schema";
import { emailsOf, inChunks, unique } from "../businesses/dal";
import { alertName, describeChange, describeProblem, detailText } from "./describe";
import { actionLabel, reasonOf, targetHref, type ActivityQuery } from "./service";

export type ActivityOutcome = "done" | "failed" | "started";

export type ActivityRow = {
  id: string;
  label: string;
  /** What changed, from the row's details ("Marked as read", "Added 50 credits"), when the label alone does not say. */
  change: string | null;
  /** Why a change did not go through or was not confirmed, in plain words. */
  problem: string | null;
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
  // A page past the end (an old link, or a filter with fewer rows) shows the last page instead of an error.
  const { result, page } = await readPage(query.page, ADMIN_PAGE_SIZE, (from, to) => {
    let list = db
      .from("admin_audit_log")
      .select("id, action, target_type, target_id, details, admin_user_id, created_at, outcome", { count: "exact" });
    if (query.area) list = list.like("action", `${query.area}.%`);
    // "Only problems": a change that did not go through, or whose result was never confirmed (BUG-278).
    if (query.failed) list = list.neq("outcome", "done");
    return list.order("created_at", { ascending: false }).order("id").range(from, to);
  });
  const { data, error, count } = result;
  if (error) throw new Error(`Admin activity: ${error.message}`);

  const [emails, targets] = await Promise.all([emailsOf(unique(data.map((r) => r.admin_user_id))), targetsOf(data)]);
  const rows = data.map((r): ActivityRow => {
    const outcome = (r.outcome as ActivityOutcome) ?? "done";
    const target = targets.get(`${r.target_type}:${r.target_id}`);
    // An alert's kind is also on the row once resolved, so a purged alert still has a name.
    const name = target?.name ?? (r.target_type === "system_alert" ? alertName(detailText(r.details, "kind")) : null);
    return {
      id: r.id,
      label: actionLabel(r.action),
      change: describeChange(r.action, r.details),
      problem: describeProblem(outcome, r.details),
      // Only Stripe webhooks write without an admin; any other row lost its admin when that account was deleted.
      by: r.action.startsWith("stripe.") ? "Stripe" : r.admin_user_id ? (emails.get(r.admin_user_id) ?? "A removed admin") : "A removed admin",
      target: { name, href: name ? targetHref(r.target_type, r.target_id, target?.businessId) : null, kind: r.target_type },
      reason: reasonOf(r.details, r.action),
      outcome,
      at: r.created_at,
    };
  });
  const total = count ?? 0;
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

type Target = { name: string; businessId?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The name of what each row changed, keyed "type:id": agencies, businesses, leads, scans, requests and alerts. */
async function targetsOf(rows: { target_type: string; target_id: string | null }[]): Promise<Map<string, Target>> {
  // Every target table has uuid ids; anything else in the log would only make the lookup fail.
  const ids = (type: string) => unique(rows.filter((r) => r.target_type === type).map((r) => r.target_id)).filter((id) => UUID.test(id));
  const db = createServiceClient();
  const [agencies, leads, jobs, requests, alerts] = await Promise.all([
    byIds(ids("agency"), (c) => db.from("agencies").select("id, name").in("id", c)),
    byIds(ids("lead"), (c) => db.from("contact_submissions").select("id, name, email").in("id", c)),
    byIds(ids("scan_job"), (c) => db.from("scan_jobs").select("id, business_id").in("id", c)),
    byIds(ids("feature_request"), (c) => db.from("feature_requests").select("id, title").in("id", c)),
    byIds(ids("system_alert"), (c) => db.from("system_alerts").select("id, kind").in("id", c)),
  ]);
  const businesses = await byIds(unique([...ids("business"), ...jobs.map((j) => j.business_id)]), (c) =>
    db.from("businesses").select("id, name").in("id", c),
  );
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));

  const out = new Map<string, Target>();
  for (const a of agencies) out.set(`agency:${a.id}`, { name: a.name });
  for (const [id, name] of businessName) out.set(`business:${id}`, { name });
  for (const l of leads) out.set(`lead:${l.id}`, { name: l.name.trim() || l.email });
  for (const j of jobs) {
    const name = businessName.get(j.business_id);
    out.set(`scan_job:${j.id}`, { name: name ? `Scan of ${name}` : "A scan", businessId: j.business_id });
  }
  for (const f of requests) out.set(`feature_request:${f.id}`, { name: f.title });
  for (const a of alerts) out.set(`system_alert:${a.id}`, { name: alertName(a.kind) });
  return out;
}

/** Rows for these ids, read in chunks so each .in() filter stays inside the URL length limit. */
async function byIds<T>(ids: string[], read: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  return inChunks(ids, async (chunk) => {
    const { data, error } = await read(chunk);
    if (error) throw new Error(`Admin activity: ${error.message}`);
    return data ?? [];
  });
}
