import type { Banner } from "./service";

// The app's alert bell (owner, 2026-11-17): the account notices the banners show, each business whose newest scan did
// not run, and each whose last scan left an AI unchecked (2026-11-18), as one list with a level (Critical, High, Medium) like the admin bell's. Pure.

export type AppAlertIcon = "account" | "card" | "credits" | "trial" | "test" | "scan";

export type AppAlert = {
  id: string;
  severity: "critical" | "high" | "medium";
  icon: AppAlertIcon;
  title: string;
  text: string;
  /** "12:30" today, else "Nov 14", in the viewer's time zone; null for account notices with no single moment. */
  when: string | null;
  link: { label: string; href: string } | null;
};

/** A scan that went wrong (jobs scanProblems), with the business it belongs to. */
export type ScanAlertInput = { businessId: string; jobId: string; reason: string; at: string | null };

/** A scan that ran but left an AI unchecked (overview lastScanNotices), with the notice the Overview shows. */
export type CoverageAlertInput = { businessId: string; runId: string; at: string | null; text: string };

const BANNER: Record<Banner["kind"], { title: string; icon: AppAlertIcon }> = {
  suspended: { title: "Account paused", icon: "account" },
  past_due: { title: "Payment didn't go through", icon: "card" },
  out_of_credits: { title: "Out of credits", icon: "credits" },
  low_credits: { title: "Credits running low", icon: "credits" },
  trial: { title: "Free trial", icon: "trial" },
  ended: { title: "Plan ended", icon: "account" },
  test_mode: { title: "Test mode", icon: "test" },
};
const LEVEL: Record<Banner["tone"], AppAlert["severity"]> = { danger: "critical", warning: "high", info: "medium" };

/**
 * The one bar shown across the top of every page (owner, 2026-11-17): only a problem that stops scans now (account
 * paused, payment failed, plan or trial ended, out of credits), the most urgent of them. Everything else, low credits,
 * trial days left, lives in the alert bell, and test mode is a pill in the top bar. `banners` is pickBanners' list.
 */
export function barBanner(banners: Banner[]): Banner | null {
  return banners.find((b) => BLOCKING.has(b.kind) || (b.kind === "trial" && b.tone !== "info")) ?? null;
}
const BLOCKING = new Set<Banner["kind"]>(["suspended", "past_due", "ended", "out_of_credits"]);

/** "12:30" when it was today in the viewer's time zone, else "Nov 14". */
export function shortWhen(iso: string, now: Date, timeZone: string): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const at = new Date(iso);
  return day(at) === day(now)
    ? new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at)
    : new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(at);
}

export function appAlerts(
  banners: Banner[],
  scans: ScanAlertInput[],
  names: Record<string, string>,
  activeBusinessId: string,
  now: Date,
  timeZone: string,
  coverage: CoverageAlertInput[] = [],
): AppAlert[] {
  // Test mode is how the account is set up, not an alert: the top bar shows it as a pill instead.
  const account = banners.filter((b) => b.kind !== "test_mode").map(
    (b): AppAlert => ({
      // The tone is in the id: a trial that ended is a new alert, not the trial notice already seen.
      id: `account:${b.kind}:${b.tone}`,
      severity: LEVEL[b.tone],
      icon: BANNER[b.kind].icon,
      title: b.kind === "trial" && b.tone !== "info" ? "Free trial ended" : BANNER[b.kind].title,
      text: b.message,
      when: null,
      link: b.action,
    }),
  );
  const scan = scans.map(
    (s): AppAlert => ({
      id: `scan:${s.jobId}`,
      severity: "high",
      icon: "scan",
      title: `Scan didn't run for ${names[s.businessId] ?? "a business"}`,
      text: s.reason,
      when: s.at ? shortWhen(s.at, now, timeZone) : null,
      // The Overview shows the open business, so the link only helps for that one.
      link: s.businessId === activeBusinessId ? { label: "Open Overview", href: "/dashboard" } : null,
    }),
  );
  // A finished scan that missed an AI: the bell said "No alerts" while the Overview showed "Perplexity couldn't be
  // checked". Left out where the scan itself did not run: that alert already says more.
  const failedScan = new Set(scans.map((s) => s.businessId));
  const missed = coverage
    .filter((c) => !failedScan.has(c.businessId))
    .map(
      (c): AppAlert => ({
        id: `coverage:${c.runId}`,
        severity: "medium",
        icon: "scan",
        title: `Some AI checks didn't run for ${names[c.businessId] ?? "a business"}`,
        text: c.text,
        when: c.at ? shortWhen(c.at, now, timeZone) : null,
        link: c.businessId === activeBusinessId ? { label: "Open Overview", href: "/dashboard" } : null,
      }),
    );
  return [...account, ...scan, ...missed];
}
