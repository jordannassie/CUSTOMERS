// Pure rules for admin Usage and cost (B-67, MVP_SPEC 9.1): credits from credit_transactions, real AI cost
// from usage_events, and whether each model still earns more per credit than it costs (D-23).

const DAY = 24 * 60 * 60 * 1000;
// "month" is this calendar month (UTC), the same stretch the Overview reports, so both pages show the same numbers.
export const PERIODS = ["month", 7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

// Below this margin a model is flagged, matching the about 70% D-23 plans for (F-38).
export const THIN_MARGIN = 0.7;

export const MODEL_KEYS = ["openai", "anthropic", "perplexity"] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];
export const MODEL_LABELS: Record<ModelKey, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };

/**
 * Credits used. From the database a row is already a sum (one day, agency and model), with `provider` set; `paid` is
 * false for credits from a free grant (trial, promo, admin), which are not revenue. A row with only `checkId` is one
 * check whose model comes from `checkProvider`.
 */
export type Capture = { agencyId: string | null; checkId?: string; provider?: string | null; paid?: boolean; credits: number; createdAt: string };
/** Real AI cost. A row from the database sums `events` calls (default 1) of one day, agency, kind, model and cache hit. */
export type UsageRow = {
  agencyId: string | null;
  usageType: string;
  provider: string | null;
  cached: boolean;
  costUsd: number;
  events?: number;
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
  /**
   * Real cost per credit charged: the model's cost over its checks with a new answer. Cache hits charge no credit
   * (D-24), so dividing by every check made margins look better than they are (admin audit 2026-11-12).
   */
  costPerCredit: number | null;
  margin: number | null;
  verdict: Verdict;
};

export type UsageCostReport = {
  from: string;
  to: string;
  creditPriceUsd: number | null;
  /** The plan or top-up pack that price comes from, so the page can say what the floor is. */
  creditPriceBasis: string | null;
  /**
   * freeCredits: credits from trial, promo and admin grants, left out of what credits are worth. margin: paid credits
   * against ALL AI cost. paidCheckCostUsd: the AI cost of the checks paid credits bought, and paidMargin the margin on
   * those alone, so an admin can tell paying customers' margin from the cost of free trials and other AI work.
   */
  totals: {
    credits: number;
    freeCredits: number;
    costUsd: number;
    paidCheckCostUsd: number;
    checks: number;
    cached: number;
    cacheHitRate: number | null;
    margin: number | null;
    paidMargin: number | null;
  };
  byDay: { day: string; credits: number; costUsd: number }[];
  byModel: ModelMargin[];
  otherCostUsd: number;
  byAgency: { id: string | null; name: string; isTest: boolean; credits: number; costUsd: number; margin: number | null }[];
};

export const isCheck = (u: UsageRow) => u.usageType === "ai_visibility_check";

/** UTC midnight `days - 1` days before now, so the period includes today; "month" starts on the 1st. */
export function periodStart(now: Date, days: PeriodDays): Date {
  if (days === "month") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - (days - 1) * DAY);
}

/** One way a customer buys credits: a plan's monthly credits or a one-time top-up pack. */
export type CreditOffer = { name: string; priceCents: number | null; credits: number | null };

/**
 * Lowest price a customer pays for one credit across active plans AND top-up packs; the worst case for margin. Top-ups
 * can be cheaper per credit than any plan (2,000 for $180 is $0.09, the Pro plan $0.0996), so leaving them out
 * overstated every margin.
 */
export function lowestCreditPrice(offers: CreditOffer[]): { usd: number; name: string } | null {
  let best: { usd: number; name: string } | null = null;
  for (const o of offers) {
    if (o.priceCents === null || !o.credits) continue;
    const usd = o.priceCents / 100 / o.credits;
    if (!best || usd < best.usd) best = { usd, name: o.name };
  }
  return best;
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
  creditPriceBasis?: string | null;
  captures: Capture[];
  checkProvider?: Map<string, string>;
  usage: UsageRow[];
  agencies: Map<string, AgencyInfo>;
}): UsageCostReport {
  const { captures, usage, creditPriceUsd: price } = input;
  const revenue = (credits: number) => (price === null ? 0 : credits * price);
  const paidOnly = captures.filter((c) => c.paid !== false);
  const providerOf = (c: Capture) => c.provider ?? (c.checkId ? input.checkProvider?.get(c.checkId) : undefined) ?? null;
  const count = (rows: UsageRow[]) => sum(rows, (u) => u.events ?? 1);
  const credits = sum(captures, (c) => c.credits);
  const paidCredits = sum(paidOnly, (c) => c.credits);
  const costUsd = sum(usage, (u) => u.costUsd);
  const checks = usage.filter(isCheck);
  const checkCount = count(checks);
  const cached = count(checks.filter((u) => u.cached));

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
    const [rowCount, callCount] = [count(rows), count(calls)];
    const modelCost = sum(rows, (u) => u.costUsd);
    const costPerCredit = callCount > 0 ? modelCost / callCount : null;
    const margin = price !== null && costPerCredit !== null ? (price - costPerCredit) / price : null;
    return {
      model,
      label: MODEL_LABELS[model],
      credits: sum(captures.filter((c) => providerOf(c) === model), (c) => c.credits),
      checks: rowCount,
      cached: rowCount - callCount,
      costUsd: modelCost,
      costPerCredit,
      margin,
      verdict: verdictFor(margin),
    };
  });
  const checkCost = sum(byModel, (m) => m.costUsd);
  // What the checks bought with paid credits cost us: each paid credit at its model's cost per credit (the average
  // over all models when the model is not known), never more than all checks cost.
  const callCount = checkCount - cached;
  const averagePerCredit = callCount > 0 ? checkCost / callCount : 0;
  const perCredit = new Map(byModel.map((m) => [m.model as string, m.costPerCredit]));
  const paidCheckCost = Math.min(
    checkCost,
    sum(paidOnly, (c) => c.credits * (perCredit.get(providerOf(c) ?? "") ?? averagePerCredit)),
  );

  const creditsByAgency = totals(captures, (c) => c.agencyId, (c) => c.credits);
  const paidByAgency = totals(paidOnly, (c) => c.agencyId, (c) => c.credits);
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
        margin: marginOf(revenue(paidByAgency.get(id) ?? 0), agencyCost),
      };
    })
    .sort((a, b) => b.credits - a.credits || b.costUsd - a.costUsd);

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    creditPriceUsd: price,
    creditPriceBasis: input.creditPriceBasis ?? null,
    totals: {
      credits,
      freeCredits: credits - paidCredits,
      costUsd,
      paidCheckCostUsd: paidCheckCost,
      checks: checkCount,
      cached,
      cacheHitRate: checkCount > 0 ? cached / checkCount : null,
      // Only paid credits are revenue: trial and admin credits cost us AI but bring in nothing.
      margin: marginOf(revenue(paidCredits), costUsd),
      paidMargin: marginOf(revenue(paidCredits), paidCheckCost),
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
