import { describe, expect, it } from "vitest";
import { A, setup } from "./scenario.test-helpers";
import { previewPlanChange } from "./service";

describe("refusals", () => {
  it("refuses changes made now while a payment is failing", async () => {
    const { ctx, deps } = setup({ agencyStatus: "past_due" });
    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: A, planId: "pro" }, deps)).rejects.toMatchObject({
      status: 402,
    });
  });

  it("refuses a business that is not in the agency", async () => {
    const { ctx, deps } = setup();
    const other = "00000000-0000-4000-8000-0000000000ff";
    await expect(previewPlanChange(ctx, { kind: "upgrade", businessId: other, planId: "pro" }, deps)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("asks for checkout first when there is no subscription", async () => {
    const { ctx, deps } = setup();
    await expect(previewPlanChange({ ...ctx, subscriptionId: null }, { kind: "cancel" }, deps)).rejects.toThrow(
      "You don't have a plan yet. Finish checkout first.",
    );
  });
});
