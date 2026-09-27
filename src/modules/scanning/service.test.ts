import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBalance } from "@/modules/credits";
import { REASONS } from "@/modules/entitlements";
import type { ProviderId, RunCheck } from "./providers/types";
import { countryCode, nextScanAt, runScan, withCity } from "./service";
import {
  answeringRunner,
  blockAiHosts,
  createScanAgency,
  createScanBusiness,
  deleteScanUsers,
  extractNames,
  failingRunner,
  finishJob,
  newJob,
  recordedDir,
  service,
} from "./service.test-helpers";

// B-26: full scans against the local database with mocked providers (no live AI calls, keys not rotated).
afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
});
afterEach(() => {
  vi.restoreAllMocks();
  expect(aiAttempts).toEqual([]);
});

const balance = async (agencyId: string) => (await getBalance(agencyId)).balance;

function runners(overrides: Partial<Record<ProviderId, RunCheck>> = {}) {
  const all = {
    openai: answeringRunner("openai"),
    anthropic: answeringRunner("anthropic"),
    perplexity: answeringRunner("perplexity"),
    ...overrides,
  };
  return { all, checkRunner: (p: ProviderId) => all[p] };
}

async function results(runId: string) {
  const { data } = await service
    .from("visibility_results")
    .select("provider, model, business_mentioned, mention_position, competitors_mentioned, cached, cost_usd, extracted_names")
    .eq("run_id", runId);
  return data!;
}

describe("runScan (B-26)", () => {
  it("charges exactly 36 for 12 questions on 3 models, using recorded answers for a test agency", async () => {
    const agency = await createScanAgency({ isTest: true });
    const business = await createScanBusiness(agency);
    const job = await newJob(business);
    const live = runners();

    const outcome = await runScan(job, { checkRunner: live.checkRunner, recordedDir: recordedDir() });

    expect(outcome).toMatchObject({ status: "done", checks: 36, failed: 0, charged: 36, released: 0 });
    expect(await balance(agency.agencyId)).toBe(64);
    // The live runners passed in are never used for a test agency (D-61).
    for (const run of Object.values(live.all)) expect(run).not.toHaveBeenCalled();
    const { data: scan } = await service.from("scan_jobs").select("credits_charged").eq("id", job).single();
    expect(scan!.credits_charged).toBe(36);
    // Recorded answers stay out of the shared cache.
    const { count } = await service.from("ai_answer_cache").select("cache_key", { count: "exact", head: true }).ilike("question", `%${business.city}%`);
    expect(count).toBe(0);
  });

  it("charges only the successful checks when one provider fails", async () => {
    const agency = await createScanAgency();
    const business = await createScanBusiness(agency);
    const job = await newJob(business);

    const outcome = await runScan(job, { ...runners({ anthropic: failingRunner("anthropic") }), extractNames });

    expect(outcome).toMatchObject({ status: "done", checks: 36, failed: 12, charged: 24, released: 12 });
    expect(await balance(agency.agencyId)).toBe(76);
    if (outcome.status === "skipped") throw new Error("unexpected skip");
    const rows = await results(outcome.runId);
    expect(rows).toHaveLength(24);
    expect(rows.every((r) => r.provider !== "anthropic")).toBe(true);
    expect(rows[0]).toMatchObject({ business_mentioned: true, mention_position: 1, cached: false });
    expect(rows[0].competitors_mentioned).toEqual([{ name: "Rival Roasters", position: 2 }]);
    expect(rows[0].extracted_names).toMatchObject({
      names: [
        { name: "Bean There Coffee", matches: "business" },
        { name: "Rival Roasters", matches: "competitor" },
        { name: "Daily Grind", matches: null },
      ],
    });

    const { data: run } = await service.from("visibility_runs").select("status, checks_total, checks_failed, error").eq("id", outcome.runId).single();
    expect(run).toMatchObject({ status: "completed", checks_total: 36, checks_failed: 12 });
    expect(run!.error).toContain("anthropic returned 503 (12 checks)");

    const { data: biz } = await service.from("businesses").select("next_scan_at").eq("id", business.businessId).single();
    const days = (new Date(biz!.next_scan_at!).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it("serves a second business in the same city from the cache and still charges 1 credit a check", async () => {
    const agency = await createScanAgency();
    const first = await createScanBusiness(agency);
    const firstJob = await newJob(first);
    await runScan(firstJob, { ...runners(), extractNames });

    const other = await createScanAgency();
    const second = await createScanBusiness(other, first.city);
    const live = runners();
    extractNames.mockClear();
    const outcome = await runScan(await newJob(second), { checkRunner: live.checkRunner, extractNames });

    expect(outcome).toMatchObject({ status: "done", charged: 36 });
    for (const run of Object.values(live.all)) expect(run).not.toHaveBeenCalled();
    // Names were stored with the cached answers, so the hit needs no new extraction.
    expect(extractNames).not.toHaveBeenCalled();
    if (outcome.status === "skipped") throw new Error("unexpected skip");
    const rows = await results(outcome.runId);
    expect(rows.every((r) => r.cached && Number(r.cost_usd) === 0)).toBe(true);
    expect(await balance(other.agencyId)).toBe(64);

    const { data: usage } = await service.from("usage_events").select("cached, estimated_cost_usd").eq("business_id", second.businessId);
    expect(usage).toHaveLength(36);
    expect(usage!.every((u) => u.cached && Number(u.estimated_cost_usd) === 0)).toBe(true);
  });

  it("never charges a check twice when the same job runs again", async () => {
    const agency = await createScanAgency();
    const business = await createScanBusiness(agency);
    const job = await newJob(business);
    await runScan(job, { ...runners(), extractNames });

    const again = await runScan(job, { ...runners(), extractNames });

    expect(again).toEqual({ status: "skipped", reason: "This scan already finished." });
    expect(await balance(agency.agencyId)).toBe(64);
  });

  it("charges nothing and keeps the due date when every check fails", async () => {
    const agency = await createScanAgency();
    const business = await createScanBusiness(agency);
    const failing = (p: ProviderId) => failingRunner(p);

    const outcome = await runScan(await newJob(business), { checkRunner: failing, extractNames });

    expect(outcome).toMatchObject({ status: "failed", checks: 36, failed: 36, charged: 0, released: 36 });
    expect(await balance(agency.agencyId)).toBe(100);
    const { data: biz } = await service.from("businesses").select("next_scan_at").eq("id", business.businessId).single();
    expect(biz!.next_scan_at).toBeNull();
  });

  it("skips without holding credits when the plan has ended or the balance is 0", async () => {
    const canceled = await createScanAgency({ status: "canceled" });
    const job = await newJob(await createScanBusiness(canceled));
    expect(await runScan(job, runners())).toEqual({ status: "skipped", reason: REASONS.canceled });
    const { data: held } = await service.from("scan_jobs").select("hold_id").eq("id", job).single();
    expect(held!.hold_id).toBeNull();
    await finishJob(job);

    const empty = await createScanAgency({ credits: 0 });
    expect(await runScan(await newJob(await createScanBusiness(empty)), runners())).toEqual({
      status: "skipped",
      reason: REASONS.outOfCredits,
    });
  });
});

describe("scan helpers", () => {
  it("adds the city to a question that lacks it", () => {
    expect(withCity("What is the best dentist?", "Orange", "CA")).toBe("What is the best dentist in Orange, CA?");
    expect(withCity("Best dentist in Orange?", "Orange", "CA")).toBe("Best dentist in Orange?");
  });

  it("turns saved country names into ISO codes", () => {
    expect(countryCode("United States")).toBe("US");
    expect(countryCode("ca")).toBe("CA");
    expect(countryCode(null)).toBe("US");
  });

  it("sets the next scan from the frequency", () => {
    const from = new Date("2026-09-27T02:00:00Z");
    expect(nextScanAt("daily", from).toISOString()).toBe("2026-09-28T02:00:00.000Z");
    expect(nextScanAt("monthly", from).toISOString()).toBe("2026-10-27T02:00:00.000Z");
  });
});
