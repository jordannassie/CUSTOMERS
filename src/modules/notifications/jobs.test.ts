import { describe, expect, it, vi } from "vitest";
import type { SendEmailInput } from "@/modules/email";
import type { SentLowCredits } from "./dal";
import { AGENCY_STOP_MS, runLowCredits, runWeeklyReport, TIME_BUDGET_MS, type JobDeps } from "./jobs";
import { lowCreditsKey, OutOfTime, weeklyReportKey, type LowCreditAgency, type ReportedBusiness } from "./service";

// The weekly report job's order and time limits, with every read and send faked: no database, no email.
const NOW = new Date("2026-10-26T13:00:00Z");
const scored: ReportedBusiness = { name: "Sunrise Coffee", score: 60, sentence: null, change: null, fixes: [], moreFixes: 0, reportUrl: "/r/x", snapshot: null };
const unscored: ReportedBusiness = { ...scored, score: null };

type FakeOpts = {
  businesses?: JobDeps["businesses"];
  tried?: string[];
  handled?: string[];
  low?: LowCreditAgency[];
  sentLow?: SentLowCredits[];
};

function fakeDeps(agencies: string[], opts: FakeOpts = {}) {
  const clock = { t: NOW.getTime() };
  const sent: SendEmailInput[] = [];
  const unsent: { agencyId: string; status: string; reason: string; idempotencyKey: string }[] = [];
  const keyOf = (id: string) => weeklyReportKey(id, NOW);
  const deps: JobDeps = {
    lowCreditAgencies: async () => opts.low ?? [],
    sentLowCredits: async (ids, since) => (opts.sentLow ?? []).filter((s) => ids.includes(s.agencyId) && s.sentAt >= since),
    reportAgencies: async () => agencies.map((id) => ({ id, ownerUserId: `owner-${id}` })),
    businesses: opts.businesses ?? (async (id) => [id.startsWith("empty") ? unscored : scored]),
    ownerEmail: async (owner) => `${owner}@example.test`,
    ownerOf: async () => null,
    keyStates: async () => ({ handled: new Set((opts.handled ?? []).map(keyOf)), tried: new Set((opts.tried ?? []).map(keyOf)) }),
    recordUnsent: vi.fn(async (row) => {
      unsent.push(row);
    }),
    send: vi.fn(async (input) => {
      sent.push(input);
      return { status: "sent" as const, providerId: `re_${sent.length}` };
    }),
    now: () => new Date(clock.t),
  };
  return { deps, sent, unsent, clock, keyOf };
}

describe("weekly report job", () => {
  it("logs an agency with nothing to report as skipped under its key, so later runs pass over it", async () => {
    const { deps, sent, unsent, keyOf } = fakeDeps(["empty-1", "a2"]);
    expect(await runWeeklyReport(deps)).toEqual({ sent: 1, skipped: 1, failed: 0, remaining: 0 });
    expect(sent.map((s) => s.to)).toEqual(["owner-a2@example.test"]);
    expect(unsent).toEqual([expect.objectContaining({ agencyId: "empty-1", status: "skipped", reason: "nothing to report", idempotencyKey: keyOf("empty-1") })]);
  });

  it("passes over handled agencies and puts ones that failed last time at the end", async () => {
    const order: string[] = [];
    const { deps } = fakeDeps(["slow", "a2", "done", "a3"], {
      tried: ["slow"],
      handled: ["done"],
      businesses: async (id) => {
        order.push(id);
        return [scored];
      },
    });
    expect(await runWeeklyReport(deps)).toMatchObject({ sent: 3 });
    expect(order).toEqual(["a2", "a3", "slow"]);
  });

  it("stops an agency between businesses when time is up, logs it to go last, and starts no more agencies", async () => {
    const { deps, sent, unsent, clock } = fakeDeps(["big", "small"], {
      businesses: async (id, _now, outOfTime) => {
        if (id !== "big") return [scored];
        // Each group of businesses takes 3 seconds; the check before the next group says stop.
        const out: ReportedBusiness[] = [];
        while (true) {
          if (outOfTime()) throw new OutOfTime();
          clock.t += 3_000;
          out.push(scored);
        }
      },
    });
    expect(await runWeeklyReport(deps)).toEqual({ sent: 0, skipped: 0, failed: 0, remaining: 2 });
    expect(clock.t - NOW.getTime()).toBeGreaterThanOrEqual(AGENCY_STOP_MS);
    expect(clock.t - NOW.getTime()).toBeLessThan(AGENCY_STOP_MS + 3_000);
    expect(TIME_BUDGET_MS).toBeLessThan(AGENCY_STOP_MS);
    expect(sent).toEqual([]);
    expect(unsent).toEqual([expect.objectContaining({ agencyId: "big", status: "failed", reason: "out of time" })]);
  });

  it("counts an agency whose data fails as failed and carries on with the rest", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, sent, unsent } = fakeDeps(["bad", "a2"], {
      businesses: async (id) => {
        if (id === "bad") throw new Error("overview failed");
        return [scored];
      },
    });
    expect(await runWeeklyReport(deps)).toEqual({ sent: 1, skipped: 0, failed: 1, remaining: 0 });
    expect(sent).toHaveLength(1);
    expect(unsent).toEqual([expect.objectContaining({ agencyId: "bad", status: "failed", reason: "overview failed" })]);
  });
});

describe("low credits job (BUG-280)", () => {
  const started = new Date("2026-10-02T00:00:00Z");
  const periodKey = new Date("2026-11-02T00:00:00Z");
  const sentAt = new Date("2026-10-20T00:00:00Z");
  const agency = (id: string, level: LowCreditAgency["level"]): LowCreditAgency => ({
    agencyId: id,
    level,
    used: 100,
    total: 100,
    balance: level === "negative" ? -5 : level === "empty" ? 0 : 15,
    periodEnd: periodKey,
    periodKey,
    periodStartedAt: started,
  });
  const withOwners = (deps: JobDeps) => Object.assign(deps, { ownerOf: async (id: string) => `owner-${id}` });

  it("skips an agency already emailed at the same level group this period under an old key", async () => {
    const { deps, sent } = fakeDeps([], {
      low: [agency("old-empty", "negative"), agency("old-low", "empty"), agency("before", "empty"), agency("new", "low")],
      sentLow: [
        // Old keys used the period end and kept empty and negative apart.
        { agencyId: "old-empty", idempotencyKey: "low_credits:old-empty:2026-10-30T00:00:00.000Z:empty", sentAt },
        // Only the 80% email this period: running out is a new email.
        { agencyId: "old-low", idempotencyKey: "low_credits:old-low:2026-10-30T00:00:00.000Z:low", sentAt },
        // Last period's email does not count.
        { agencyId: "before", idempotencyKey: "low_credits:before:2026-10-02T00:00:00.000Z:empty", sentAt: new Date("2026-09-20T00:00:00Z") },
      ],
    });
    expect(await runLowCredits(withOwners(deps))).toEqual({ sent: 3, skipped: 0, failed: 0, remaining: 0 });
    expect(sent.map((s) => s.idempotencyKey)).toEqual(
      [agency("old-low", "empty"), agency("before", "empty"), agency("new", "low")].map((a) => lowCreditsKey(a, NOW)),
    );
  });

  it("does not look for earlier emails when the period start is unknown", async () => {
    const { deps, sent } = fakeDeps([], { low: [{ ...agency("trial", "low"), periodKey: null, periodStartedAt: null }] });
    const lookup = vi.spyOn(deps, "sentLowCredits");
    expect(await runLowCredits(withOwners(deps))).toMatchObject({ sent: 1 });
    expect(lookup).not.toHaveBeenCalled();
    expect(sent[0].idempotencyKey).toBe("low_credits:trial:2026-10:low");
  });
});
