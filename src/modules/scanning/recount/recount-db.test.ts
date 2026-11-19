import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createScanAgency, createScanBusiness, deleteScanUsers, service } from "../service.test-helpers";
import { recountSavedAnswers } from "./dal";

// BUG-122: a competitor added after some scans is looked for in the saved answers at once, and marked as checked
// from the oldest of them, so it is not "still collecting" for 30 days.
afterAll(deleteScanUsers);

describe("recountSavedAnswers", () => {
  it("counts a competitor added later in answers saved before, and records how far back", async () => {
    const agency = await createScanAgency({ isTest: true, credits: 0 });
    const business = await createScanBusiness(agency);
    const { data: run } = await service
      .from("visibility_runs")
      .insert({ business_id: business.businessId, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    const at = new Date(Date.now() - 20 * 86_400_000).toISOString();
    const id = randomUUID();
    await service
      .from("visibility_results")
      .insert({ id, run_id: run.id, business_id: business.businessId, provider: "openai", created_at: at, business_mentioned: false, competitors_mentioned: [], answer_text: "1. **Lakeside Roasters** - great espresso." })
      .throwOnError();
    await service.from("business_competitors").insert({ business_id: business.businessId, name: "Lakeside Roasters" }).throwOnError();

    expect(await recountSavedAnswers(business.businessId)).toMatchObject({ checked: 1, changed: 1 });
    const { data: row } = await service.from("visibility_results").select("competitors_mentioned").eq("id", id).single().throwOnError();
    expect(row.competitors_mentioned).toEqual([{ name: "Lakeside Roasters", position: 1 }]);
    const { data: competitor } = await service.from("business_competitors").select("checked_from").eq("business_id", business.businessId).eq("name", "Lakeside Roasters").single().throwOnError();
    expect(Date.parse(competitor.checked_from!)).toBe(Date.parse(at));

    // A second run changes nothing.
    expect(await recountSavedAnswers(business.businessId)).toMatchObject({ checked: 1, changed: 0 });
  });
});
