import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { adminAdjustCredits } from "./dal";
import { getBalance } from "./service";
import { balanceOf, createAdmin, createAgency, deleteTestUsers, ledgerSum, service } from "./credits.test-helpers";

// B-13: admin_adjust_credits against the local database (D-55).
afterAll(deleteTestUsers);

describe("admin_adjust_credits (B-13)", () => {
  it("adjusts by hand in both directions, settling or creating overdraft", async () => {
    const agency = await createAgency();
    const adminId = await createAdmin();
    const by = { agencyId: agency.agencyId, adminUserId: adminId };

    await adminAdjustCredits({ ...by, delta: 10, note: "goodwill", requestId: randomUUID() });
    expect(await balanceOf(agency)).toBe(10);
    await adminAdjustCredits({ ...by, delta: -15, note: "correction", requestId: randomUUID() });
    expect(await getBalance(agency.agencyId)).toMatchObject({ balance: -5, overdraft: 5 });
    await adminAdjustCredits({ ...by, delta: 7, note: "refund", requestId: randomUUID() });
    expect(await getBalance(agency.agencyId)).toMatchObject({ balance: 2, overdraft: 0 });
    expect(await ledgerSum(agency)).toBe(2);

    const { data: rows } = await service.from("credit_transactions").select("admin_user_id, note").eq("agency_id", agency.agencyId);
    expect(rows!.every((r) => r.admin_user_id === adminId && r.note)).toBe(true);
  });


  it("applies a double-submitted admin adjustment once", async () => {
    const agency = await createAgency();
    const adminId = await createAdmin();
    const by = { agencyId: agency.agencyId, adminUserId: adminId };

    const add = { ...by, delta: 20, note: "goodwill", requestId: randomUUID() };
    const [a, b] = await Promise.all([adminAdjustCredits(add), adminAdjustCredits(add)]);
    expect(a).toBe(b);
    expect(await balanceOf(agency)).toBe(20);

    const remove = { ...by, delta: -5, note: "correction", requestId: randomUUID() };
    const [c, d] = await Promise.all([adminAdjustCredits(remove), adminAdjustCredits(remove)]);
    expect(c).toBe(d);
    expect(await balanceOf(agency)).toBe(15);
    expect(await ledgerSum(agency)).toBe(15);
  });

});
