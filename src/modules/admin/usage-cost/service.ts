// Pure rules for admin Usage & Cost (B-67, MVP_SPEC 9.1): credits from credit_transactions, real AI cost
// from usage_events, and whether each model still earns more per check than it costs (D-23).

const DAY = 24 * 60 * 60 * 1000;
export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

// Below this margin a model is flagged; D-23 plans for about 70%.
export const THIN_MARGIN = 0.5;

export const MODEL_KEYS = ["openai", "anthropic", "perplexity"] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];
export const MODEL_LABELS: Record<ModelKey, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };

export type Capture = { agencyId: string | null; checkId: string; credits: number; createdAt: string };
export type UsageRow = {
  agencyId: string | null;
  usageType: string;
  provider: string | null;
  cached: boolean;
  costUsd: number;
  createdAt: string;
};
export type AgencyInfo = { name: string; isTest: boolean };
export type Verdict = "profitable" | "thin" | "losing" | "no_data";

export type ModelMargin = {
  model: ModelKey;
  label: string;
  credits: number;
  checks: number;
  cached: number;
  costUsd: number;
  /** Real cost per charged check, cache hits included (they cost 0). */
  costPerCheck: number | null;
  /** Cost of one real API call, what a check costs when the cache does not help. */
  costPerCall: number | null;
  margin: number | null;
  verdict: Verdict;
};

export type UsageCostReport = {
  from: string;
  to: string;
  creditPriceUsd: number | null;
  totals: { credits: number; costUsd: number; checks: number; cached: number; cacheHitRate: number | null; margin: number | null };
  byDay: { day: string; credits: number; costUsd: number }[];
  byModel: ModelMargin[];
  otherCostUsd: number;
  byAgency: { id: string | null; name: string; isTest: boolean; credits: number; costUsd: number; margin: number | null }[];
};

export const isCheck = (u: UsageRow) => u.usageType === "ai_visibility_check";

/** UTC midnight `days - 1` days before now, so the period includes today. */
export function periodStart(now: Date, days: PeriodDays): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - (days - 1) * DAY);
}

/** Lowest price a customer pays for one credit across the active plans; the worst case for margin. */
export function lowestCreditPrice(plans: { priceCents: number | null; monthlyCredits: number | null }[]): number | null {
  const prices = plans
    .filter((p) => p.priceCents !== null && p.monthlyCredits)
    .map((p) => p.priceCents! / 100 / p.monthlyCredits!);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export function marginOf(revenueUsd: number, costUsd: number): number | null {
  return revenueUsd > 0 ? (revenueUsd - costUsd) / revenueUsd : null;
}

export function verdictFor(margin: number | null): Verdict {
  if (margin === null) return "no_data";
  if (margin < 0) return "losing";
  return margin < THIN_MARGIN ? "thin" : "profitable";
}

export function buildReport(input: {
  from: Date;
  to: Date;
  creditPriceUsd: number | null;
  captures: Capture[];
  checkProvider: Map<string, string>;
  usage: UsageRow[];
  agencies: Map<string, AgencyInfo>;
}): UsageCostReport {
  const { captures, usage, creditPriceUsd: price } = input;
  const revenue = (credits: number) => (price === null ? 0 : credits * price);
  const credits = sum(captures, (c) => c.credits);
  const costUsd = sum(usage, (u) => u.costUsd);
  const checks = usage.filter(isCheck);
  const cached = checks.filter((u) => u.cached).length;

  const creditsByDay = totals(captures, (c) => c.createdAt.slice(0, 10), (c) => c.credits);
  const costByDay = totals(usage, (u) => u.createdAt.slice(0, 10), (u) => u.costUsd);
  const byDay = days(input.from, input.to).map((day) => ({
    day,
    credits: creditsByDay.get(day) ?? 0,
    costUsd: costByDay.get(day) ?? 0,
  }));

  const byModel = MODEL_KEYS.map((model): ModelMargin => {
    const rows = checks.filter((u) => u.provider === model);
    const calls = rows.filter((u) => !u.cached);
    const modelCost = sum(rows, (u) => u.costUsd);
    const costPerCheck = rows.length > 0 ? modelCost / rows.length : null;
    const margin = price !== null && costPerCheck !== null ? (price - costPerCheck) / price : null;
    return {
      model,
      label: MODEL_LABELS[model],
      credits: sum(captures.filter((c) => input.checkProvider.get(c.checkId) === model), (c) => c.credits),
      checks: rows.length,
      cached: rows.length - calls.length,
      costUsd: modelCost,
      costPerCheck,
      costPerCall: calls.length > 0 ? sum(calls, (u) => u.costUsd) / calls.length : null,
      margin,
      verdict: verdictFor(margin),
    };
  });
  const checkCost = sum(byModel, (m) => m.costUsd);

  const creditsByAgency = totals(captures, (c) => c.agencyId, (c) => c.credits);
  const costByAgency = totals(usage, (u) => u.agencyId, (u) => u.costUsd);
  const agencyIds = new Set([...creditsByAgency.keys(), ...costByAgency.keys()]);
  const byAgency = [...agencyIds]
    .map((id) => {
      const agencyCredits = creditsByAgency.get(id) ?? 0;
      const agencyCost = costByAgency.get(id) ?? 0;
      const info = id ? input.agencies.get(id) : undefined;
      // A deleted account's ledger rows lose their agency (MVP_SPEC 23).
      return {
        id,
        name: info?.name ?? "Deleted accounts",
        isTest: info?.isTest ?? false,
        credits: agencyCredits,
        costUsd: agencyCost,
        margin: marginOf(revenue(agencyCredits), agencyCost),
      };
    })
    .sort((a, b) => b.credits - a.credits || b.costUsd - a.costUsd);

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    creditPriceUsd: price,
    totals: {
      credits,
      costUsd,
      checks: checks.length,
      cached,
      cacheHitRate: checks.length > 0 ? cached / checks.length : null,
      margin: marginOf(revenue(credits), costUsd),
    },
    byDay,
    byModel,
    otherCostUsd: costUsd - checkCost,
    byAgency,
  };
}

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

function totals<T, K>(rows: T[], key: (row: T) => K, value: (row: T) => number): Map<K, number> {
  const out = new Map<K, number>();
  for (const row of rows) out.set(key(row), (out.get(key(row)) ?? 0) + value(row));
  return out;
}

function days(from: Date, to: Date): string[] {
  const out: string[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
