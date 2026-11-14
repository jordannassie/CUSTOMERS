import "server-only";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { adminEmails } from "@/modules/auth";
import { createLogEmailClient, sendEmail } from "@/modules/email";
import type { ContactInput, FeatureRequestInput, FEATURE_STATUSES } from "./schema";
import { newLeadEmail, shouldEmailAdmins, type NewLead } from "./lead-email";

// Contact messages (contact_submissions) and feature requests, with the service role: the tables have no policies
// for these writes. Callers check who may do this first: the public form is rate limited, the widget needs a signed-in
// user, and the admin screens call requireAdmin().

export type SaveResult = { ok: true } | { ok: false };

export async function saveContactMessage(
  input: Omit<ContactInput, "interest" | "topic" | "_honey"> & { topic: string; ipHash: string | null },
): Promise<{ ok: true; id: string } | { ok: false }> {
  // Linked to the signed-in user when there is one; the form is public, so none is fine.
  let userId: string | null = null;
  try {
    const { data } = await (await createClient()).auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  const { data, error } = await createServiceClient().from("contact_submissions").insert({
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
  }).select("id").single();
  if (error) console.error("[contact] insert error:", error.message);
  // The id lets the admin email link to the lead and be sent once per lead.
  return error || !data ? { ok: false } : { ok: true, id: data.id };
}

/**
 * Emails every admin about a new lead (one per lead and admin, kept by email_log). Runs after the visitor has their
 * answer, and never throws: a failed email must not lose the lead, which is already saved. Outside production the
 * email is logged, not sent, like the admin alerts (.env.local may hold a real key).
 */
export async function notifyAdminsOfLead(lead: NewLead): Promise<void> {
  if (!shouldEmailAdmins(lead)) return;
  const client = env.NODE_ENV === "production" ? undefined : createLogEmailClient();
  for (const to of adminEmails()) {
    try {
      await sendEmail(newLeadEmail(lead, to), client ? { client } : {});
    } catch (err) {
      console.error("[contact] new lead email failed:", err instanceof Error ? err.message : err);
    }
  }
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
  /** The sender's agency (the business's, else the one they own), so the admin can open it. */
  agencyId: string | null;
  agencyName: string | null;
};

/** The admin list, newest first, with each sender's email; `error` when the table cannot be read. */
export async function listFeatureRequests(): Promise<{ requests: FeatureRequestRow[] } | { error: string }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("feature_requests")
    .select("id, user_id, business_id, title, description, page_context, status, created_at, businesses ( name, agency_id )")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { error: error.message };
  // Every sender's email in one call (migration 092), instead of one Auth request per sender in turn.
  const userIds = [...new Set(data.map((r) => r.user_id))];
  const business = (r: (typeof data)[number]) => (Array.isArray(r.businesses) ? r.businesses[0] : r.businesses) ?? null;
  const [{ data: users }, { data: agencies }] = await Promise.all([
    db.rpc("admin_user_emails", { p_ids: userIds }),
    db.from("agencies").select("id, name, owner_user_id").in("owner_user_id", userIds),
  ]);
  const emails = new Map((users ?? []).map((u) => [u.id, u.email]));
  const agencyById = new Map((agencies ?? []).map((a) => [a.id, a]));
  const agencyByOwner = new Map((agencies ?? []).map((a) => [a.owner_user_id, a]));
  const agencyOf = (r: (typeof data)[number]) => {
    const id = business(r)?.agency_id;
    return (id && agencyById.get(id)) || agencyByOwner.get(r.user_id) || (id ? { id, name: null } : null);
  };
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
      businessName: business(r)?.name ?? null,
      agencyId: agencyOf(r)?.id ?? null,
      agencyName: agencyOf(r)?.name ?? null,
    })),
  };
}
