import { afterAll, describe, expect, it } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { cleanUp, harness, service, setup } from "./harness.test-helpers";

// M3 (2026-10-16): a top-up queues at once the scans that did not run for lack of credits, instead of leaving them
// for the next 02:00 run. On the local database; no Stripe calls.
afterAll(cleanUp);

const jobsOf = async (agencyId: string) =>
  (await service.from("scan_jobs").select("business_id, status").eq("agency_id", agencyId).throwOnError()).data;

describe("a top-up and skipped scans", () => {
  it("queues the agency's due scans once the credits are in, and a replay queues nothing more", async () => {
    // A test agency at 0 credits, both businesses due: the nightly run left them out.
    const a = await setup("active");
    expect(await jobsOf(a.agencyId)).toEqual([]);

    const h = harness();
    const session = fx.checkoutSession({
      mode: "payment",
      customer: a.customer,
      agencyId: a.agencyId,
      metadata: { kind: "topup", topup_pack_id: "topup_500", credits: "500" },
    });
    for (const res of await h.deliverTwice(fx.event("checkout.session.completed", session))) expect(res.status).toBe(200);

    const jobs = await jobsOf(a.agencyId);
    expect(jobs.map((j) => j.business_id).sort()).toEqual([...a.businesses].sort());
    expect(jobs.every((j) => j.status === "queued")).toBe(true);
  });
});
