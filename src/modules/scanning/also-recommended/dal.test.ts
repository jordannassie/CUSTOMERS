import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createScanAgency, createScanBusiness, deleteScanUsers, service } from "../service.test-helpers";
import { loadAlsoRecommended } from "./dal";

// BUG-110: a same-day rescan saved the same cached answers again, and "Kingdom Plumbing in 24 answers" was 12.
afterAll(deleteScanUsers);

describe("loadAlsoRecommended", () => {
  it("counts an answer saved again by a same-day rescan once", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const { data: run } = await service
      .from("visibility_runs")
      .insert({ business_id: business.businessId, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    const names = { promptVersion: "v1", names: [{ name: "Kingdom Plumbing", position: 1, matches: null, competitorName: null }] };
    const row = (answer: string, cached: boolean) => ({
      id: randomUUID(),
      run_id: run.id,
      business_id: business.businessId,
      provider: "openai",
      business_mentioned: false,
      competitors_mentioned: [],
      cached,
      answer_text: answer,
      extracted_names: names,
    });
    await service
      .from("visibility_results")
      .insert([row("first answer", false), row("second answer", false), row("first answer", true), row("second answer", true)])
      .throwOnError();

    const list = await loadAlsoRecommended(agency.agencyId, business.businessId, new Date());
    expect(list?.answers).toBe(2);
    expect(list?.names.find((n) => n.name === "Kingdom Plumbing")).toMatchObject({ answers: 2 });
  });
});
