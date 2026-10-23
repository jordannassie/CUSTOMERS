import { describe, expect, it } from "vitest";
import { A, C, setup } from "./scenario.test-helpers";
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

  it("never adds or upgrades a deleted business, but still lets its item come off (BUG-120)", async () => {
    const { ctx, deps } = setup();
    const gone = { ...ctx, businesses: ctx.businesses.map((b) => (b.id === C || b.id === A ? { ...b, deleted: true } : b)) };
    await expect(previewPlanChange(gone, { kind: "add", businessId: C, planId: "starter" }, deps)).rejects.toMatchObject({ status: 409 });
    await expect(previewPlanChange(gone, { kind: "upgrade", businessId: A, planId: "pro" }, deps)).rejects.toMatchObject({ status: 409 });
    await expect(previewPlanChange(gone, { kind: "remove", businessId: A }, deps)).resolves.toMatchObject({ timing: "period_end" });
  });

  it("asks for checkout first when there is no subscription", async () => {
    const { ctx, deps } = setup();
    await expect(previewPlanChange({ ...ctx, subscriptionId: null }, { kind: "cancel" }, deps)).rejects.toThrow(
      "You don't have a plan yet. Finish checkout first.",
    );
  });
});
