import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createScanAgency, createScanBusiness, deleteScanUsers, service } from "../service.test-helpers";
import { loadScoreReport } from "./dal";

// B-30 step 2: the 30-day aggregates read from saved checks on the local database.
afterAll(deleteScanUsers);

const NOW = new Date();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("loadScoreReport", () => {
  it("scores the business's last 30 days of checks and hides other agencies' businesses", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const { data: prompts } = await service
      .from("tracked_prompts")
      .select("id")
      .eq("business_id", business.businessId)
      .order("created_at")
      .throwOnError();
    const { data: run } = await service
      .from("visibility_runs")
      .insert({
        business_id: business.businessId,
        provider: "scan",
        status: "completed",
      })
      .select("id")
      .single()
      .throwOnError();
    const row = (
      provider: string,
      promptId: string,
      at: string,
      mentioned: boolean,
      rival = false,
      cached = false,
    ) => ({
      id: randomUUID(),
      run_id: run.id,
      business_id: business.businessId,
      tracked_prompt_id: promptId,
      provider,
      created_at: at,
      business_mentioned: mentioned,
      competitors_mentioned: rival ? [{ name: "Rival Roasters", position: 2 }] : [],
      cached,
      // A cached check saves the answer text of the check it reused, so the two count as one answer.
      answer_text: `${provider} answer to ${promptId}`,
    });
    const [q1, q2] = prompts.map((p) => p.id);
    await service
      .from("visibility_results")
      .insert([
        row("openai", q1, hoursAgo(2), true, true),
        row("openai", q1, hoursAgo(1), true, true, true),
        row("openai", q2, hoursAgo(2), false),
        row("openai", q2, hoursAgo(1), true, false, true),
        row("anthropic", q1, hoursAgo(2), false, true),
        row("anthropic", q2, hoursAgo(2), false),
        // Outside the 30-day window.
        row("anthropic", q1, hoursAgo(31 * 24), true),
      ])
      .throwOnError();

    const report = await loadScoreReport(agency.agencyId, business.businessId, NOW);
    expect(report?.byModel.map((m) => [m.model, m.estimate.score, m.estimate.checks])).toEqual([
      ["openai", 75, 4],
      ["anthropic", 0, 2],
    ]);
    // 3 of 6 answers, pooled (D-91). It was 37.5 under D-65, the average of 75 and 0.
    expect(report?.overall).toMatchObject({
      score: 50,
      checks: 6,
      uniqueAnswers: 4,
      confidence: "early",
    });
    expect(report?.competitors).toEqual([{ name: "Rival Roasters", score: 50, standing: "about_same", change: null, chain: null }]);
    expect(report?.questions.slice(0, 2).map((q) => [q.appeared, q.checks])).toEqual([
      [2, 3],
      [1, 3],
    ]);
    expect(report?.trend).toHaveLength(7);

    const other = await createScanAgency({ isTest: true, credits: 0 });
    expect(await loadScoreReport(other.agencyId, business.businessId, NOW)).toBeNull();
  });

  it("counts only suggested questions that are active now, and sums the user's own questions apart (BUG-129)", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const { data: prompts } = await service
      .from("tracked_prompts")
      .select("id")
      .eq("business_id", business.businessId)
      .order("created_at")
      .throwOnError();
    const [suggested, paused] = prompts.map((p) => p.id);
    await service.from("tracked_prompts").update({ active: false }).eq("id", paused).throwOnError();
    const { data: own } = await service
      .from("tracked_prompts")
      .insert({ business_id: business.businessId, prompt: "Which coffee shop sells my own blend?", source: "custom" })
      .select("id")
      .single()
      .throwOnError();
    const { data: run } = await service
      .from("visibility_runs")
      .insert({ business_id: business.businessId, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    const row = (promptId: string, mentioned: boolean, i: number) => ({
      run_id: run.id,
      business_id: business.businessId,
      tracked_prompt_id: promptId,
      provider: "openai",
      created_at: hoursAgo(1),
      business_mentioned: mentioned,
      competitors_mentioned: [],
      answer_text: `answer ${i} to ${promptId}`,
    });
    await service
      .from("visibility_results")
      .insert([row(suggested, true, 0), row(suggested, false, 1), row(paused, true, 2), row(own.id, true, 3), row(own.id, false, 4), row(own.id, true, 5)])
      .throwOnError();

    const report = await loadScoreReport(agency.agencyId, business.businessId, NOW);
    expect(report?.overall).toMatchObject({ score: 50, checks: 2 });
    expect(report?.ownQuestions).toEqual({ named: 2, answers: 3 });
    // The user's own question is still checked and charged, so it stays in the list of active questions.
    expect(report?.questions.map((q) => q.id)).toContain(own.id);
  });

  it("names the chain when most answers that counted for a tracked branch named only the chain", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const branch = "Bennu Coffee on Congress";
    await service.from("business_competitors").insert({ business_id: business.businessId, name: branch, city: business.city }).throwOnError();
    const { data: prompts } = await service
      .from("tracked_prompts")
      .select("id")
      .eq("business_id", business.businessId)
      .order("created_at")
      .throwOnError();
    const { data: run } = await service
      .from("visibility_runs")
      .insert({ business_id: business.businessId, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    const answers = ["Try Bennu Coffee, open 24 hours.", "Bennu Coffee has several locations.", "Bennu Coffee on Congress is open late."];
    await service
      .from("visibility_results")
      .insert(
        answers.map((answer_text, i) => ({
          run_id: run.id,
          business_id: business.businessId,
          tracked_prompt_id: prompts[i].id,
          provider: "openai",
          created_at: hoursAgo(1),
          business_mentioned: i === 0,
          competitors_mentioned: [{ name: branch, position: null }],
          answer_text,
        })),
      )
      .throwOnError();

    const report = await loadScoreReport(agency.agencyId, business.businessId, NOW);
    // 1 of 3 answers named the Congress branch, so its score is the chain's.
    expect(report?.competitors.map((c) => [c.name, c.chain])).toEqual([
      [branch, "Bennu Coffee"],
      ["Rival Roasters", null],
    ]);
  });
});
