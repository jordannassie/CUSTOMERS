import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { captureCredit, grantCredits, holdCredits, releaseHold } from "@/modules/credits";
import { loadUsageReport } from "./dal";

// B-56: the Usage page's numbers against the ledger for a test agency on the local database.
const service = createServiceClient();
const userIds: string[] = [];
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

async function seedAgency() {
  const { data: user, error } = await service.auth.admin.createUser({
    email: `vitest-usage-${randomUUID()}@example.test`,
    email_confirm: true,
  });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const owner = user.user.id;

  const { data: agency } = await service
    .from("agencies")
    .insert({
      owner_user_id: owner,
      name: "Usage test",
      is_test: true,
      status: "active",
      current_period_end: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: businesses } = await service
    .from("businesses")
    .insert([
      { owner_user_id: owner, agency_id: agency.id, name: "Joe's Plumbing", status: "active", scan_frequency: "weekly" },
      { owner_user_id: owner, agency_id: agency.id, name: "Joe's Heating", status: "active", scan_frequency: "daily" },
    ])
    .select("id, name")
    .order("name", { ascending: false })
    .throwOnError();
  for (const b of businesses) {
    await service
      .from("tracked_prompts")
      .insert(Array.from({ length: 2 }, (_, i) => ({ business_id: b.id, prompt: `Question ${i}`, active: true })))
      .throwOnError();
  }
  return { agencyId: agency.id, businessIds: businesses.map((b) => b.id) };
}

/** Runs a scan through the credit functions: `ok` checks per model are charged, the rest returned. */
async function runScan(agencyId: string, businessId: string, ok: Record<string, number>, planned: number) {
  const { data: job } = await service
    .from("scan_jobs")
    .insert({ agency_id: agencyId, business_id: businessId, status: "running" })
    .select("id")
    .single()
    .throwOnError();
  const hold = await holdCredits(agencyId, planned, job.id);
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "scan" })
    .select("id")
    .single()
    .throwOnError();
  for (const [provider, count] of Object.entries(ok)) {
    for (let i = 0; i < count; i++) {
      const checkId = randomUUID();
      await service.from("visibility_results").insert({ id: checkId, run_id: run.id, business_id: businessId, provider }).throwOnError();
      await captureCredit(hold, checkId);
    }
  }
  await releaseHold(hold);
  await service.from("scan_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", job.id).throwOnError();
  return job.id;
}

async function ledger(agencyId: string) {
  const { data } = await service
    .from("credit_transactions")
    .select("delta, kind, hold_id, created_at")
    .eq("agency_id", agencyId)
    .throwOnError();
  return data;
}

describe("usage report (B-56)", () => {
  it("matches the ledger for balance, month, business, model and each scan", async () => {
    const { agencyId, businessIds } = await seedAgency();
    const [plumbing, heating] = businessIds;
    await grantCredits({ agencyId, source: "plan", sourceId: `inv-${randomUUID()}`, amount: 100, expiresAt: new Date(Date.now() + 30 * 86_400_000) });
    await grantCredits({ agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 50, expiresAt: null });

    const first = await runScan(agencyId, plumbing, { openai: 2, anthropic: 2, perplexity: 2 }, 6);
    // Perplexity failed every check here: planned 6, charged 4.
    const second = await runScan(agencyId, heating, { openai: 2, anthropic: 2 }, 6);
    const third = await runScan(agencyId, plumbing, { openai: 1, anthropic: 2, perplexity: 2 }, 6);

    const report = await loadUsageReport(agencyId, new Date());
    const rows = await ledger(agencyId);
    const captures = rows.filter((r) => r.kind === "capture");
    const { data: jobs } = await service.from("scan_jobs").select("id, business_id, hold_id, credits_charged").eq("agency_id", agencyId).throwOnError();
    const businessOfHold = new Map(jobs.map((j) => [j.hold_id, j.business_id]));
    const spentOn = (pick: (r: (typeof captures)[number]) => boolean) =>
      captures.filter(pick).reduce((total, r) => total - r.delta, 0);

    // No open holds, so the balance is the ledger total.
    expect(report.balance.total).toBe(rows.reduce((total, r) => total + r.delta, 0));
    expect(report.balance.plan + report.balance.topup).toBe(report.balance.total);
    expect(report.balance).toMatchObject({ plan: 85, topup: 50, held: 0, overdraft: 0 });

    expect(report.month.used).toBe(spentOn(() => true));
    expect(report.month.used).toBe(15);

    expect(report.byBusiness).toEqual([
      { id: plumbing, name: "Joe's Plumbing", credits: spentOn((r) => businessOfHold.get(r.hold_id) === plumbing) },
      { id: heating, name: "Joe's Heating", credits: spentOn((r) => businessOfHold.get(r.hold_id) === heating) },
    ]);
    expect(report.byBusiness.map((b) => b.credits)).toEqual([11, 4]);

    expect(report.byModel).toEqual([
      { model: "anthropic", label: "Claude", credits: 6 },
      { model: "openai", label: "ChatGPT", credits: 5 },
      { model: "perplexity", label: "Perplexity", credits: 4 },
    ]);
    expect(report.byModel.reduce((total, m) => total + m.credits, 0)).toBe(report.month.used);

    const jobById = new Map(jobs.map((j) => [j.id, j]));
    expect(report.scans.map((s) => s.id)).toEqual([third, second, first]);
    for (const scan of report.scans) {
      const job = jobById.get(scan.id)!;
      expect(scan.credits).toBe(spentOn((r) => r.hold_id === job.hold_id));
      expect(scan.credits).toBe(job.credits_charged);
    }
    expect(report.scans.map((s) => s.credits)).toEqual([5, 4, 6]);

    // 2 questions x 3 models, weekly and daily over the 14 days to renewal.
    expect(report.forecast.kind).toBe("renewal");
    expect(report.forecast.available).toBe(report.balance.total);
    expect(report.forecast.needed).toBe(report.forecast.scans * 6);
  });

  it("shows an empty report for an agency with no scans", async () => {
    const { agencyId } = await seedAgency();
    const report = await loadUsageReport(agencyId, new Date());
    expect(report.balance.total).toBe(0);
    expect(report.month.used).toBe(0);
    expect(report.byBusiness).toEqual([]);
    expect(report.byModel).toEqual([]);
    expect(report.scans).toEqual([]);
    expect(report.forecast.runsOutAt).not.toBeNull();
  });

  it("reads more than one page of ledger rows", async () => {
    const { agencyId, businessIds } = await seedAgency();
    await grantCredits({ agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 1_200, expiresAt: null });
    const { data: job } = await service
      .from("scan_jobs")
      .insert({ agency_id: agencyId, business_id: businessIds[0] })
      .select("id")
      .single()
      .throwOnError();
    const hold = await holdCredits(agencyId, 1_050, job.id);
    for (let i = 0; i < 1_050; i += 50) {
      await Promise.all(Array.from({ length: 50 }, () => captureCredit(hold, randomUUID())));
    }
    await releaseHold(hold);

    const report = await loadUsageReport(agencyId, new Date());
    expect(report.month.used).toBe(1_050);
    expect(report.byModel).toEqual([{ model: "unknown", label: "Model not recorded", credits: 1_050 }]);
    expect(report.scans[0].credits).toBe(1_050);
  }, 60_000);
});
