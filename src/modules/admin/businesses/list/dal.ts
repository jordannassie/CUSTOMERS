import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/modules/auth";
import { readPage } from "../../paging";
import { ADMIN_PAGE_SIZE } from "../../schema";
import { allRows, emailsOf, inChunks, inList, unique, userIdsByEmail } from "../dal";
import { startOfMonthUtc, toScanState, type ScanState } from "../service";
import { BUSINESS_FILTERS, type BusinessFilter } from "../schema";

async function testAgencyIds(): Promise<string[]> {
  const rows = await allRows("test agencies", (from, to) =>
    createServiceClient().from("agencies").select("id").eq("is_test", true).order("id").range(from, to),
  );
  return rows.map((r) => r.id);
}

// The admin Businesses list (B-66), 50 a page with a search box. It checks admin access itself (BUG-286).

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin businesses: could not load ${what}: ${error.message}`);
}

export type AdminBusinessRow = {
  id: string;
  name: string;
  location: string;
  agency: { id: string; name: string; ownerEmail: string | null; isTest: boolean } | null;
  plan: string | null;
  frequency: string;
  models: string[];
  /** The newest scan and when it started (was queued). */
  lastScan: { state: ScanState; at: string } | null;
  creditsThisMonth: number;
  deleted: { at: string; purgeAfter: string | null } | null;
  /** Still in setup (status onboarding): no plan or schedule yet. */
  draft: boolean;
  /** Paused by its owner: kept, but not scanned on its schedule. */
  paused: boolean;
};

export type AdminBusinessList = {
  rows: AdminBusinessRow[];
  /** Businesses the search and tab match, on every page. */
  total: number;
  /** How many businesses the search matches on each tab, shown on the tabs. */
  counts: Record<BusinessFilter, number>;
  page: number;
  pages: number;
};

/** The search box as a condition: the business name, its agency's name, or its owner's login email. */
async function searchCondition(search: string): Promise<string | null> {
  if (!search) return null;
  const db = createServiceClient();
  const [agencies, users] = await Promise.all([
    allRows("agencies by name", (from, to) =>
      db.from("agencies").select("id").ilike("name", `%${search}%`).order("id").range(from, to),
    ),
    userIdsByEmail(search),
  ]);
  return `name.ilike."%${search}%",agency_id.in.${inList(agencies.map((a) => a.id))},owner_user_id.in.${inList(users)}`;
}

type Filterable<Q> = {
  is: (c: string, v: null) => Q;
  not: (c: string, o: string, v: null) => Q;
  eq: (c: string, v: string) => Q;
  in: (c: string, v: string[]) => Q;
  or: (f: string) => Q;
};

/** One tab as a condition: live (scanning on its schedule), paused, being set up, deleted, or of a test agency. */
function onTab<Q extends Filterable<Q>>(query: Q, filter: BusinessFilter, testAgencies: string[]): Q {
  if (filter === "live") return query.is("deleted_at", null).in("status", ["active", "scanning"]);
  if (filter === "paused") return query.is("deleted_at", null).eq("status", "paused");
  if (filter === "setup") return query.is("deleted_at", null).eq("status", "onboarding");
  if (filter === "deleted") return query.not("deleted_at", "is", null);
  if (filter === "test") return query.or(`agency_id.in.${inList(testAgencies)}`);
  return query;
}

/** One page of businesses across every agency, newest first, for a search (business, agency or owner email). */
export async function listBusinesses(
  { search = "", page = 1, filter = "all" }: { search?: string; page?: number; filter?: BusinessFilter } = {},
  now = new Date(),
): Promise<AdminBusinessList> {
  await requireAdmin();
  const db = createServiceClient();
  const [condition, testAgencies] = await Promise.all([searchCondition(search), testAgencyIds()]);
  const scoped = <Q extends { or: (filters: string) => Q }>(query: Q) => (condition ? query.or(condition) : query);

  // A page past the end (an old link, a list that shrank) shows the last page instead of the error screen.
  const [{ result: pageResult, page: shownPage }, tabCounts] = await Promise.all([
    readPage(page, ADMIN_PAGE_SIZE, (from, to) =>
      onTab(
        scoped(
          db
            .from("businesses")
            .select("id, name, primary_city, primary_region, agency_id, status, scan_frequency, models, created_at, deleted_at, purge_after", {
              count: "exact",
            }),
        ),
        filter,
        testAgencies,
      )
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    Promise.all(
      BUSINESS_FILTERS.map(async (f) => {
        const { count, error } = await onTab(scoped(db.from("businesses").select("id", { count: "exact", head: true })), f, testAgencies);
        if (error) fail(`the ${f} count`, error);
        return [f, count ?? 0] as const;
      }),
    ),
  ]);
  if (pageResult.error) fail("businesses", pageResult.error);
  const businesses = pageResult.data ?? [];

  const ids = businesses.map((b) => b.id);
  const agencyIds = unique(businesses.map((b) => b.agency_id));
  // The last scan and this month's credits come back already worked out, one row per business (migration 092),
  // instead of every scan and credit the page's 50 businesses ever had.
  const [agencies, subscriptions, lastScans, monthCredits] = await Promise.all([
    inChunks(agencyIds, async (chunk) => {
      const { data, error } = await db.from("agencies").select("id, name, owner_user_id, is_test").in("id", chunk);
      if (error) fail("agencies", error);
      return data;
    }),
    inChunks(ids, async (chunk) => {
      const { data, error } = await db.from("business_subscriptions").select("business_id, plans(name)").in("business_id", chunk);
      if (error) fail("plans", error);
      return data;
    }),
    inChunks(ids, async (chunk) => {
      const { data, error } = await db.rpc("admin_last_scans", { p_business_ids: chunk });
      if (error) fail("last scans", error);
      return data;
    }),
    inChunks(ids, async (chunk) => {
      const { data, error } = await db.rpc("admin_business_credits", { p_business_ids: chunk, p_since: startOfMonthUtc(now).toISOString() });
      if (error) fail("credits this month", error);
      return data;
    }),
  ]);
  const emails = await emailsOf(agencies.map((a) => a.owner_user_id));

  const agencyById = new Map(agencies.map((a) => [a.id, a]));
  const planOf = new Map(subscriptions.map((s) => [s.business_id, s.plans?.name ?? null]));
  // Businesses scanned before the job queue existed only have runs.
  const lastJob = new Map(lastScans.filter((r) => r.kind === "job").map((r) => [r.business_id, r]));
  const lastRun = new Map(lastScans.filter((r) => r.kind === "run").map((r) => [r.business_id, r]));
  const credits = new Map(monthCredits.map((c) => [c.business_id, Number(c.credits)]));

  const rows = businesses.map((b): AdminBusinessRow => {
    const agency = b.agency_id ? agencyById.get(b.agency_id) : undefined;
    const job = lastJob.get(b.id);
    const run = lastRun.get(b.id);
    // When the scan started (was queued), as the business page and the Scans page show it, so one scan has one date.
    const last = job ?? run;
    const lastScan = last ? { state: toScanState(last.status), at: last.created_at } : null;
    return {
      id: b.id,
      name: b.name,
      location: [b.primary_city, b.primary_region].filter(Boolean).join(", "),
      agency: agency
        ? {
            id: agency.id,
            name: agency.name,
            ownerEmail: emails.get(agency.owner_user_id) ?? null,
            isTest: agency.is_test,
          }
        : null,
      plan: planOf.get(b.id) ?? null,
      frequency: b.scan_frequency,
      models: b.models,
      lastScan,
      creditsThisMonth: credits.get(b.id) ?? 0,
      deleted: b.deleted_at ? { at: b.deleted_at, purgeAfter: b.purge_after } : null,
      draft: b.status === "onboarding",
      paused: b.status === "paused",
    };
  });

  const total = pageResult.count ?? 0;
  return {
    rows,
    total,
    counts: Object.fromEntries(tabCounts) as Record<BusinessFilter, number>,
    page: shownPage,
    pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}
