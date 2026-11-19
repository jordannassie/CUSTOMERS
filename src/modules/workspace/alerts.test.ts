import { describe, expect, it } from "vitest";
import { appAlerts, barBanner, shortWhen } from "./alerts";
import type { Banner } from "./service";

const now = new Date("2026-11-17T12:00:00Z");
const banner = (b: Partial<Banner>): Banner => ({ kind: "past_due", tone: "danger", message: "Your last payment didn't go through.", action: { label: "Update card", href: "/settings/billing" }, ...b });

describe("the app's alert bell (owner, 2026-11-17)", () => {
  it("turns each banner into an alert with a level: danger is Critical, warning High, info Medium", () => {
    const alerts = appAlerts(
      [banner({}), banner({ kind: "low_credits", tone: "warning", message: "Only 10 credits left." }), banner({ kind: "trial", tone: "info", message: "5 days left." })],
      [],
      {},
      "b1",
      now,
      "UTC",
    );
    expect(alerts.map((a) => [a.title, a.severity])).toEqual([
      ["Payment didn't go through", "critical"],
      ["Credits running low", "high"],
      ["Free trial", "medium"],
    ]);
    expect(alerts[0].link).toEqual({ label: "Update card", href: "/settings/billing" });
  });

  it("names a trial that ended, and leaves test mode out (the top bar has a pill for it)", () => {
    const alerts = appAlerts([banner({ kind: "trial", tone: "warning" }), banner({ kind: "test_mode", tone: "warning", action: null })], [], {}, "b1", now, "UTC");
    expect(alerts.map((a) => a.title)).toEqual(["Free trial ended"]);
    expect(alerts[0].id).not.toBe(appAlerts([banner({ kind: "trial", tone: "info" })], [], {}, "b1", now, "UTC")[0].id);
  });

  it("says which business a scan did not run for, linking the Overview only for the open one", () => {
    const scans = [
      { businessId: "b1", jobId: "j1", reason: "Add the business city in Settings, then run a scan.", at: "2026-11-17T09:05:00Z" },
      { businessId: "b2", jobId: "j2", reason: "Your last scan didn't finish.", at: "2026-11-14T09:05:00Z" },
    ];
    const [open, other] = appAlerts([], scans, { b1: "Cafe", b2: "Bakery" }, "b1", now, "UTC");
    expect(open).toMatchObject({ id: "scan:j1", severity: "high", title: "Scan didn't run for Cafe", when: "09:05", link: { href: "/dashboard" } });
    expect(other).toMatchObject({ title: "Scan didn't run for Bakery", when: "Nov 14", link: null });
  });

  it("dates in the viewer's time zone", () => {
    expect(shortWhen("2026-11-17T02:00:00Z", now, "America/Los_Angeles")).toBe("Nov 16");
  });
});

describe("the one bar across the top (owner, 2026-11-17)", () => {
  it("shows only a problem that stops scans, the most urgent first", () => {
    const test = banner({ kind: "test_mode", tone: "warning", action: null });
    const low = banner({ kind: "low_credits", tone: "warning" });
    const trialInfo = banner({ kind: "trial", tone: "info" });
    expect(barBanner([test, low, trialInfo])).toBeNull();
    expect(barBanner([test, banner({}), banner({ kind: "out_of_credits" })])?.kind).toBe("past_due");
    expect(barBanner([test, banner({ kind: "trial", tone: "warning" })])?.kind).toBe("trial");
    expect(barBanner([banner({ kind: "suspended" })])?.kind).toBe("suspended");
    expect(barBanner([banner({ kind: "ended", tone: "warning" })])?.kind).toBe("ended");
  });
});

describe("AI checks a finished scan missed (2026-11-18)", () => {
  const notice = "In the last scan, Perplexity couldn't be checked. We'll try again in the next scan. Failed checks are never charged.";
  const names = { b1: "Brian's Coffee Spot", b2: "Second Cafe" };

  it("shows the Overview's notice in the bell, linked for the open business", () => {
    const alerts = appAlerts([], [], names, "b1", now, "UTC", [
      { businessId: "b1", runId: "r1", at: "2026-11-17T09:15:00Z", text: notice },
      { businessId: "b2", runId: "r2", at: "2026-11-16T09:15:00Z", text: notice },
    ]);
    expect(alerts.map((a) => [a.id, a.title, a.severity, a.when])).toEqual([
      ["coverage:r1", "Some AI checks didn't run for Brian's Coffee Spot", "medium", "09:15"],
      ["coverage:r2", "Some AI checks didn't run for Second Cafe", "medium", "Nov 16"],
    ]);
    expect(alerts[0]).toMatchObject({ text: notice, link: { label: "Open Overview", href: "/dashboard" } });
    expect(alerts[1].link).toBeNull();
  });

  it("is left out when that business's scan did not run at all: that alert says more", () => {
    const alerts = appAlerts([], [{ businessId: "b1", jobId: "j1", reason: "Your last scan didn't finish.", at: null }], names, "b1", now, "UTC", [
      { businessId: "b1", runId: "r1", at: null, text: notice },
    ]);
    expect(alerts.map((a) => a.id)).toEqual(["scan:j1"]);
  });
});
