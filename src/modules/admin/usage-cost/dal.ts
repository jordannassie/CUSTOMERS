import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildReport,
  lowestCreditPrice,
  periodStart,
  type AgencyInfo,
  type Capture,
  type PeriodDays,
  type UsageCostReport,
  type UsageRow,
} from "./service";

// PostgREST caps a response at 1,000 rows, so every table is read in pages.
const PAGE = 1000;
// Keeps each .in() filter well inside the URL length limit.
const ID_CHUNK = 200;

export type UsageCostOptions = { days: PeriodDays; includeTest: boolean };

/** Credits used and real AI cost for the period, by day, model and agency. Test agencies are left out unless asked. */
export async function getUsageCost(options: UsageCostOptions): Promise<UsageCostReport> {
  await requireAdmin();
  return loadUsageCost(options, new Date());
}

// Callers check admin access first.
export async function loadUsageCost({ days, includeTest }: UsageCostOptions, now: Date): Promise<UsageCostReport> {
  return loadUsageCostSince(periodStart(now, days), includeTest, now);
}

/**
 * Same report from any start date; the admin Overview uses the start of last month. The sums are made in the database
 * (migration 092): grouped rows by day, agency and model come back instead of every capture and usage event of the
 * period, which made 90 days slow. Callers check admin access.
 */
export async function loadUsageCostSince(from: Date, includeTest: boolean, now: Date, agencyId?: string): Promise<UsageCostReport> {
  const db = createServiceClient();
  const args = { p_from: from.toISOString(), p_to: now.toISOString(), p_include_test: includeTest, ...(agencyId && { p_agency_id: agencyId }) };
  const [planRows, packRows, creditRows, costRows] = await Promise.all([
    readAll((a, b) => db.from("plans").select("name, price_cents, monthly_credits").eq("active", true).order("id").range(a, b)),
    // Top-up packs too: one can sell credits cheaper than any plan, and the floor must be the real lowest price.
    readAll((a, b) => db.from("topup_packs").select("name, price_cents, credits").eq("active", true).order("id").range(a, b)),
    readAll((a, b) => db.rpc("admin_usage_credits", args).order("day").order("agency_id").order("provider").order("paid").range(a, b)),
    readAll((a, b) =>
      db.rpc("admin_usage_costs", args).order("day").order("agency_id").order("usage_type").order("provider").order("cached").range(a, b),
    ),
  ]);

  // RPC rows type their columns as non-null; a deleted account's rows really have no agency or model.
  const captures: Capture[] = creditRows.map((r) => ({
    agencyId: (r.agency_id as string | null) ?? null,
    provider: (r.provider as string | null) ?? null,
    paid: r.paid,
    credits: Number(r.credits),
    createdAt: r.day,
  }));
  const usage: UsageRow[] = costRows.map((r) => ({
    agencyId: (r.agency_id as string | null) ?? null,
    usageType: r.usage_type,
    provider: (r.provider as string | null) ?? null,
    cached: r.cached,
    costUsd: Number(r.cost_usd),
    events: Number(r.events),
    createdAt: r.day,
  }));

  const cheapest = lowestCreditPrice([
    ...planRows.map((p) => ({ name: `the ${p.name} plan`, priceCents: p.price_cents, credits: p.monthly_credits })),
    ...packRows.map((p) => ({ name: `the ${p.name} top-up`, priceCents: p.price_cents, credits: p.credits })),
  ]);
  return buildReport({
    from,
    to: now,
    creditPriceUsd: cheapest?.usd ?? null,
    creditPriceBasis: cheapest?.name ?? null,
    captures,
    usage,
    agencies: await agencyNames([...captures, ...usage].map((r) => r.agencyId)),
  });
}

/** Names and test flags of only the agencies in the report, not the whole table. */
async function agencyNames(ids: (string | null)[]): Promise<Map<string, AgencyInfo>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const rows: { id: string; name: string; is_test: boolean }[] = [];
  for (let i = 0; i < wanted.length; i += ID_CHUNK) {
    const { data, error } = await createServiceClient().from("agencies").select("id, name, is_test").in("id", wanted.slice(i, i + ID_CHUNK));
    if (error) throw new Error(`Usage and cost: ${error.message}`);
    rows.push(...data);
  }
  return new Map(rows.map((a) => [a.id, { name: a.name, isTest: a.is_test }]));
}

async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Usage and cost: ${error.message}`);
    rows.push(...data!);
    if (data!.length < PAGE) return rows;
  }
}
