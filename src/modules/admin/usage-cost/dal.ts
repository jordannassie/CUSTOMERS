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

/** Same report from any start date; the admin Overview uses the start of the month. Callers check admin access. */
export async function loadUsageCostSince(from: Date, includeTest: boolean, now: Date): Promise<UsageCostReport> {
  const db = createServiceClient();
  const [fromIso, toIso] = [from.toISOString(), now.toISOString()];
  const [agencyRows, businessRows, planRows, captureRows, usageRows] = await Promise.all([
    readAll((a, b) => db.from("agencies").select("id, name, is_test, owner_user_id").order("id").range(a, b)),
    readAll((a, b) => db.from("businesses").select("id, agency_id").order("id").range(a, b)),
    readAll((a, b) => db.from("plans").select("price_cents, monthly_credits").eq("active", true).order("id").range(a, b)),
    readAll((a, b) =>
      db
        .from("credit_transactions")
        .select("agency_id, source_id, delta, created_at")
        .eq("kind", "capture")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("id")
        .range(a, b),
    ),
    readAll((a, b) =>
      db
        .from("usage_events")
        .select("account_user_id, business_id, usage_type, provider, cached, estimated_cost_usd, created_at")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("id")
        .range(a, b),
    ),
  ]);

  const agencies = new Map<string, AgencyInfo>(agencyRows.map((a) => [a.id, { name: a.name, isTest: a.is_test }]));
  const agencyOfOwner = new Map(agencyRows.map((a) => [a.owner_user_id, a.id]));
  const agencyOfBusiness = new Map(businessRows.map((b) => [b.id, b.agency_id]));
  const keep = (agencyId: string | null) => includeTest || !(agencyId && agencies.get(agencyId)?.isTest);

  const captures: Capture[] = captureRows
    .map((r) => ({ agencyId: r.agency_id, checkId: r.source_id, credits: -r.delta, createdAt: r.created_at }))
    .filter((c) => keep(c.agencyId));
  const usage: UsageRow[] = usageRows
    .map((r) => ({
      // usage_events has no agency column: the business's agency, else the agency the user owns.
      agencyId: (r.business_id && agencyOfBusiness.get(r.business_id)) || agencyOfOwner.get(r.account_user_id) || null,
      usageType: r.usage_type,
      provider: r.provider,
      cached: r.cached,
      costUsd: Number(r.estimated_cost_usd),
      createdAt: r.created_at,
    }))
    .filter((u) => keep(u.agencyId));

  return buildReport({
    from,
    to: now,
    creditPriceUsd: lowestCreditPrice(
      planRows.map((p) => ({ priceCents: p.price_cents, monthlyCredits: p.monthly_credits })),
    ),
    captures,
    checkProvider: await providerOfChecks(captures.map((c) => c.checkId)),
    usage,
    agencies,
  });
}

async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Usage & Cost: ${error.message}`);
    rows.push(...data!);
    if (data!.length < PAGE) return rows;
  }
}

// A capture's source_id is its check's visibility_results row, which records the model that answered.
async function providerOfChecks(checkIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(checkIds)];
  const chunks = Array.from({ length: Math.ceil(unique.length / ID_CHUNK) }, (_, i) => unique.slice(i * ID_CHUNK, (i + 1) * ID_CHUNK));
  const rows = (
    await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error } = await createServiceClient().from("visibility_results").select("id, provider").in("id", chunk);
        if (error) throw new Error(`Usage & Cost: ${error.message}`);
        return data;
      }),
    )
  ).flat();
  return new Map(rows.map((r) => [r.id, r.provider]));
}
