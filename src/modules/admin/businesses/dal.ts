import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { ADMIN_SCAN_PRIORITY } from "./service";

// Admin reads cross every agency, so they use the service role; callers run requireAdmin() first.

const PAGE = 1000;
// Keeps each .in() filter well inside the URL length limit.
const ID_CHUNK = 200;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin businesses: could not load ${what}: ${error.message}`);
}

export async function inChunks<T>(ids: string[], load: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const chunks = Array.from({ length: Math.ceil(ids.length / ID_CHUNK) }, (_, i) =>
    ids.slice(i * ID_CHUNK, (i + 1) * ID_CHUNK),
  );
  return (await Promise.all(chunks.map(load))).flat();
}

type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

/** Every row, a page at a time: PostgREST caps a response at 1,000 rows. */
export async function allRows<T>(what: string, page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) fail(what, error);
    rows.push(...data!);
    if (data!.length < PAGE) return rows;
  }
}

export const unique = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => id !== null))];

/** Login email of each user id, from auth.users through one database call per 200 ids (migration 092). It used to page
 * through every user with auth.admin.listUsers, which grew slower with every signup. */
export async function emailsOf(userIds: string[]): Promise<Map<string, string>> {
  const ids = unique(userIds);
  const rows = await inChunks(ids, async (chunk) => {
    const { data, error } = await createServiceClient().rpc("admin_user_emails", { p_ids: chunk });
    if (error) fail("owner emails", error);
    return data;
  });
  return new Map(rows.filter((r) => r.email).map((r) => [r.id, r.email]));
}

/** Users whose login email contains the search text, for the admin search boxes (at most 500). */
export async function userIdsByEmail(search: string): Promise<string[]> {
  const needle = search.trim();
  if (!needle) return [];
  const { data, error } = await createServiceClient().rpc("admin_user_ids_by_email", { p_search: needle, p_limit: 500 });
  if (error) fail("users by email", error);
  return data.map((r) => r.id);
}

/** A PostgREST `in` list; an empty one matches nothing (a random id stands in, as `in.()` is refused). */
export const inList = (ids: string[]) => `(${(ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).join(",")})`;

export type Capture = {
  holdId: string | null;
  credits: number;
  createdAt: string;
};

/** Credits spent on checks, from the ledger (captures are negative deltas). */
export async function readCaptures(filter: { since?: Date; holdIds?: string[] }): Promise<Capture[]> {
  if (filter.holdIds?.length === 0) return [];
  const rows = await allRows("credit captures", (from, to) => {
    let query = createServiceClient()
      .from("credit_transactions")
      .select("id, hold_id, delta, created_at")
      .eq("kind", "capture");
    if (filter.since) query = query.gte("created_at", filter.since.toISOString());
    if (filter.holdIds) query = query.in("hold_id", filter.holdIds);
    return query.order("created_at").order("id").range(from, to);
  });
  return rows.map((r) => ({
    holdId: r.hold_id,
    credits: -r.delta,
    createdAt: r.created_at,
  }));
}

export type EnqueueResult =
  | { ok: true; jobId: string }
  | { ok: false; reason: "not_found" | "no_agency" | "deleted" | "agency_deleted" | "setup" | "paused" | "already_active" };

/** Queues a high-priority scan; the worker (B-27) holds credits and runs it. */
export async function enqueueScan(businessId: string): Promise<EnqueueResult> {
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select("agency_id, deleted_at, status, agencies(status)")
    .eq("id", businessId)
    .maybeSingle();
  if (error) fail("the business", error);
  if (!business) return { ok: false, reason: "not_found" };
  if (!business.agency_id) return { ok: false, reason: "no_agency" };
  // The worker's claim does not look at deleted_at, so a job queued here would spend credits on deleted data.
  if (business.deleted_at) return { ok: false, reason: "deleted" };
  if (business.agencies?.status === "deleted") return { ok: false, reason: "agency_deleted" };
  // The worker skips both, so a job would only say "Skipped" (admin audit 2026-11-12).
  if (business.status === "onboarding") return { ok: false, reason: "setup" };
  if (business.status === "paused") return { ok: false, reason: "paused" };

  const insert = await db
    .from("scan_jobs")
    .insert({
      business_id: businessId,
      agency_id: business.agency_id,
      priority: ADMIN_SCAN_PRIORITY,
    })
    .select("id")
    .single();
  // D-55: the unique index allows one queued or running job per business.
  if (insert.error?.code === "23505") return { ok: false, reason: "already_active" };
  if (insert.error) throw new Error(`Admin businesses: could not queue the scan: ${insert.error.message}`);
  return { ok: true, jobId: insert.data.id };
}
