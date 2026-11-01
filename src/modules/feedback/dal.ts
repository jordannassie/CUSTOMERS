import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { TablesUpdate } from "@/types/database.types";
import type { ContactInput, FeatureRequestInput, FEATURE_STATUSES, LEAD_STATUSES } from "./schema";
import { searchTerm } from "./service";

// Contact messages (contact_submissions) and feature requests, with the service role: the tables have no policies
// for these writes. Callers check who may do this first: the public form is rate limited, the widget needs a signed-in
// user, and the admin screens call requireAdmin().

export type SaveResult = { ok: true } | { ok: false };

export async function saveContactMessage(
  input: Omit<ContactInput, "interest" | "topic" | "_honey"> & { topic: string; ipHash: string | null },
): Promise<SaveResult> {
  // Linked to the signed-in user when there is one; the form is public, so none is fine.
  let userId: string | null = null;
  try {
    const { data } = await (await createClient()).auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  const { error } = await createServiceClient().from("contact_submissions").insert({
    name: input.name,
    email: input.email,
    company: input.company,
    website: input.website,
    phone: input.phone,
    topic: input.topic,
    message: input.message,
    source: input.source,
    page_path: input.page_path,
    ip_hash: input.ipHash,
    user_id: userId,
  });
  if (error) console.error("[contact] insert error:", error.message);
  return error ? { ok: false } : { ok: true };
}

/** A signed-in user's idea; the business is linked only when it is theirs. */
export async function saveFeatureRequest(userId: string, input: FeatureRequestInput): Promise<SaveResult> {
  let businessId: string | null = null;
  if (input.businessId) {
    const { data } = await (await createClient())
      .from("businesses")
      .select("id")
      .eq("id", input.businessId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    businessId = data?.id ?? null;
  }
  const { error } = await createServiceClient().from("feature_requests").insert({
    user_id: userId,
    business_id: businessId,
    title: input.title,
    description: input.description,
    page_context: input.pageContext,
    status: "new",
  });
  if (error) console.error("[feature-requests] insert error:", error.message, error.code);
  return error ? { ok: false } : { ok: true };
}

export async function setFeatureRequestStatus(id: string, status: (typeof FEATURE_STATUSES)[number]): Promise<SaveResult> {
  const { error } = await createServiceClient().from("feature_requests").update({ status }).eq("id", id);
  if (error) console.error("[feature-requests] update error:", error.message);
  return error ? { ok: false } : { ok: true };
}

export type FeatureRequestRow = {
  id: string;
  userId: string;
  businessId: string | null;
  title: string;
  description: string;
  pageContext: string | null;
  status: string;
  createdAt: string;
  email: string;
  businessName: string | null;
};

/** The admin list, newest first, with each sender's email; `error` when the table cannot be read. */
export async function listFeatureRequests(): Promise<{ requests: FeatureRequestRow[] } | { error: string }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("feature_requests")
    .select("id, user_id, business_id, title, description, page_context, status, created_at, businesses ( name )")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { error: error.message };
  const emails = new Map<string, string>();
  for (const uid of new Set(data.map((r) => r.user_id))) {
    const { data: user } = await db.auth.admin.getUserById(uid).catch(() => ({ data: null }));
    if (user?.user?.email) emails.set(uid, user.user.email);
  }
  return {
    requests: data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      businessId: r.business_id,
      title: r.title,
      description: r.description,
      pageContext: r.page_context,
      status: r.status,
      createdAt: r.created_at,
      email: emails.get(r.user_id) ?? "unknown",
      businessName: (Array.isArray(r.businesses) ? r.businesses[0] : r.businesses)?.name ?? null,
    })),
  };
}

const LEADS_PAGE_SIZE = 30;
const LEAD_COLUMNS = "id, created_at, read_at, name, email, company, website, phone, topic, message, status, source, page_path";

export async function countUnreadLeads(): Promise<number | null> {
  const { count, error } = await createServiceClient().from("contact_submissions").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) console.error("[admin/leads] count error:", error.message);
  return error ? null : (count ?? 0);
}

export async function listLeads(q: { page: number; search: string; interest: string; source: string; status: string; unread: boolean }) {
  let query = createServiceClient()
    .from("contact_submissions")
    .select(LEAD_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((q.page - 1) * LEADS_PAGE_SIZE, q.page * LEADS_PAGE_SIZE - 1);
  const search = searchTerm(q.search);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  if (q.interest) query = query.eq("topic", q.interest);
  if (q.source) query = query.eq("source", q.source);
  if (q.status) query = query.eq("status", q.status);
  if (q.unread) query = query.is("read_at", null);
  const { data, count, error } = await query;
  if (error) {
    console.error("[admin/leads] query error:", error.message);
    return null;
  }
  const total = count ?? 0;
  return { leads: data ?? [], total, page: q.page, pageSize: LEADS_PAGE_SIZE, pages: Math.ceil(total / LEADS_PAGE_SIZE) };
}

export async function updateLead(
  id: string,
  change: { status?: (typeof LEAD_STATUSES)[number]; markRead?: boolean; markUnread?: boolean },
  now = new Date(),
): Promise<{ ok: true; updates: TablesUpdate<"contact_submissions"> } | { ok: false; reason: "nothing" | "failed" }> {
  const updates: TablesUpdate<"contact_submissions"> = {};
  if (change.status) updates.status = change.status;
  if (change.markRead) updates.read_at = now.toISOString();
  if (change.markUnread) updates.read_at = null;
  if (Object.keys(updates).length === 0) return { ok: false, reason: "nothing" };
  const { error } = await createServiceClient().from("contact_submissions").update(updates).eq("id", id);
  if (error) {
    console.error("[admin/leads] update error:", error.message);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, updates };
}
