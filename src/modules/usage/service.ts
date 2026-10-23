// Pure rules for the Usage page (MVP_SPEC 8.2, D-33): where credits went and whether they last to renewal.

const DAY = 24 * 60 * 60 * 1000;
const SCAN_EVERY_DAYS = { daily: 1, weekly: 7, monthly: 30 } as const;
const FALLBACK_WINDOW_DAYS = 30;

export type ModelKey = "openai" | "anthropic" | "perplexity" | "unknown";

export const MODEL_LABELS: Record<ModelKey, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  unknown: "Model not recorded",
};

export function toModelKey(provider: string | undefined): ModelKey {
  return provider === "openai" || provider === "anthropic" || provider === "perplexity" ? provider : "unknown";
}

export type Schedule = {
  businessId: string;
  businessName: string;
  frequency: keyof typeof SCAN_EVERY_DAYS;
  nextScanAt: Date | null;
  creditsPerScan: number;
};

export type ForecastWindow = { endsAt: Date; kind: "renewal" | "trial" | "estimate" };

export type Forecast = ForecastWindow & {
  scans: number;
  needed: number;
  available: number;
  /** Date of the first scheduled scan that the remaining credits cannot cover. Null when they last. */
  runsOutAt: Date | null;
};

/** Trial end during a trial, else the paid period end; the next 30 days when neither is ahead. */
export function forecastWindow(
  account: { status: string; trialEndsAt: Date | null; periodEndsAt: Date | null },
  now: Date,
): ForecastWindow {
  if (account.status === "trialing" && account.trialEndsAt && account.trialEndsAt > now) {
    return { endsAt: account.trialEndsAt, kind: "trial" };
  }
  if (account.periodEndsAt && account.periodEndsAt > now) return { endsAt: account.periodEndsAt, kind: "renewal" };
  return { endsAt: new Date(now.getTime() + FALLBACK_WINDOW_DAYS * DAY), kind: "estimate" };
}

/** Every scheduled scan from now to the end of the window, soonest first. */
export function scheduledScans(schedules: Schedule[], now: Date, endsAt: Date): { at: Date; credits: number }[] {
  const scans: { at: Date; credits: number }[] = [];
  for (const s of schedules) {
    if (s.creditsPerScan <= 0) continue;
    const step = SCAN_EVERY_DAYS[s.frequency] * DAY;
    // An overdue or never-scheduled business scans as soon as the worker picks it up.
    let at = Math.max(s.nextScanAt?.getTime() ?? now.getTime(), now.getTime());
    for (; at <= endsAt.getTime(); at += step) scans.push({ at: new Date(at), credits: s.creditsPerScan });
  }
  return scans.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function forecast(schedules: Schedule[], available: number, window: ForecastWindow, now: Date): Forecast {
  const scans = scheduledScans(schedules, now, window.endsAt);
  let used = 0;
  let runsOutAt: Date | null = null;
  for (const scan of scans) {
    used += scan.credits;
    if (runsOutAt === null && used > available) runsOutAt = scan.at;
  }
  return { ...window, scans: scans.length, needed: used, available, runsOutAt };
}

export function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Sums credits per key, biggest first. */
export function totalsBy<T>(items: T[], key: (item: T) => string, credits: (item: T) => number) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(key(item), (totals.get(key(item)) ?? 0) + credits(item));
  return [...totals].map(([k, total]) => ({ key: k, credits: total })).sort((a, b) => b.credits - a.credits);
}
