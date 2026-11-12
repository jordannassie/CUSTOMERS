import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { readPage } from "@/modules/admin";
import type { TablesUpdate } from "@/types/database.types";
import { leadUpdates, NO_HANDLER, searchPattern } from "../lead-rules";
import { OLD_LEAD_SOURCES, OLD_LEAD_STATUSES, OLD_LEAD_TOPICS, type LEAD_STATUSES } from "../schema";

// The admin Leads screen (contact_submissions), with the service role: the table has no policies for admin reads.
// Callers check requireAdmin() first.

const LEADS_PAGE_SIZE = 30;
const LEAD_COLUMNS =
  "id, created_at, read_at, name, email, company, website, phone, topic, message, status, source, page_path, admin_notes, handled_by, replied_at";

export type LeadFilters = {
  page: number;
  search: string;
  interest: string;
  source: string;
  status: string;
  unread: boolean;
  replied?: "" | "yes" | "no";
  handler?: string;
};

export async function countUnreadLeads(): Promise<number | null> {
  const { count, error } = await createServiceClient().from("contact_submissions").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) console.error("[admin/leads] count error:", error.message);
  return error ? null : (count ?? 0);
}

function leadsPage(q: LeadFilters, from: number, to: number) {
  let query = createServiceClient()
    .from("contact_submissions")
    .select(LEAD_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  const search = searchPattern(q.search);
  if (search) query = query.or(`name.ilike.${search},email.ilike.${search},company.ilike.${search}`);
  if (q.interest) query = query.eq("topic", q.interest);
  if (q.source) query = query.eq("source", q.source);
  // The Status filter matches the list badge (leadStage): New is unopened and unanswered, Opened is read only.
  if (q.status === "new") query = query.eq("status", "new").is("read_at", null).is("replied_at", null);
  else if (q.status === "opened") query = query.eq("status", "new").not("read_at", "is", null).is("replied_at", null);
  else if (q.status === "contacted") query = query.or("status.eq.contacted,and(status.eq.new,replied_at.not.is.null)");
  else if (q.status) query = query.eq("status", q.status);
  if (q.unread) query = query.is("read_at", null);
  if (q.replied === "yes") query = query.not("replied_at", "is", null);
  if (q.replied === "no") query = query.is("replied_at", null);
  if (q.handler === NO_HANDLER) query = query.is("handled_by", null);
  else if (q.handler) query = query.eq("handled_by", q.handler.toLowerCase());
  return query;
}

/** One page of leads, newest first; a page past the end shows the last page. null when the table cannot be read. */
export async function listLeads(q: LeadFilters) {
  const { result, page } = await readPage(q.page, LEADS_PAGE_SIZE, (from, to) => leadsPage(q, from, to));
  const { data, count, error } = result;
  if (error) {
    console.error("[admin/leads] query error:", error.message);
    return null;
  }
  const total = count ?? 0;
  return { leads: data ?? [], total, page, pageSize: LEADS_PAGE_SIZE, pages: Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE)) };
}

export type AdminLead = NonNullable<Awaited<ReturnType<typeof listLeads>>>["leads"][number];

/** One lead by id, for a shared link to a lead that is not on the page shown. */
export async function getLead(id: string): Promise<AdminLead | null> {
  const { data, error } = await createServiceClient().from("contact_submissions").select(LEAD_COLUMNS).eq("id", id).maybeSingle();
  if (error) console.error("[admin/leads] read error:", error.message);
  return data ?? null;
}

/**
 * The older topics, sources and statuses some lead still has, so the filters list only those (as "Older: ...").
 * A failed count keeps the value, so a lead is never left without a filter that finds it.
 */
export async function oldLeadValuesInUse(): Promise<{ topics: string[]; sources: string[]; statuses: string[] }> {
  const db = createServiceClient();
  const inUse = async (column: "topic" | "source" | "status", values: readonly string[]) => {
    const counts = await Promise.all(
      values.map((v) => db.from("contact_submissions").select("id", { count: "exact", head: true }).eq(column, v)),
    );
    return values.filter((_, i) => counts[i].error || (counts[i].count ?? 0) > 0);
  };
  const [topics, sources, statuses] = await Promise.all([
    inUse("topic", OLD_LEAD_TOPICS),
    inUse("source", OLD_LEAD_SOURCES),
    inUse("status", OLD_LEAD_STATUSES),
  ]);
  return { topics, sources, statuses };
}

export async function updateLead(
  id: string,
  change: {
    status?: (typeof LEAD_STATUSES)[number];
    markRead?: boolean;
    markUnread?: boolean;
    adminNotes?: string;
    handledBy?: string;
    replied?: boolean;
  },
  now = new Date(),
): Promise<{ ok: true; updates: TablesUpdate<"contact_submissions"> } | { ok: false; reason: "nothing" | "failed" }> {
  const db = createServiceClient();
  // Marking as replied moves a New lead to Contacted in the same update, so its status is read first.
  let currentStatus: string | null = null;
  if (change.replied && !change.status) {
    const { data, error } = await db.from("contact_submissions").select("status").eq("id", id).maybeSingle();
    if (error) {
      console.error("[admin/leads] read error:", error.message);
      return { ok: false, reason: "failed" };
    }
    currentStatus = data?.status ?? null;
  }
  const updates: TablesUpdate<"contact_submissions"> = leadUpdates(change, currentStatus, now);
  if (Object.keys(updates).length === 0) return { ok: false, reason: "nothing" };
  const { error } = await db.from("contact_submissions").update(updates).eq("id", id);
  if (error) {
    console.error("[admin/leads] update error:", error.message);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, updates };
}
