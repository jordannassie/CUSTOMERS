import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { grantCredits } from "@/modules/credits";
import { createAgencyWithBusiness, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";
import type { Database } from "@/types/database.types";

// The admin Agencies list against the local database `npm test` rebuilds, signed in as a real test admin.
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});

const { listAgencies } = await import("./dal");
const { loadAgencyDetail, loadAgencyName } = await import("./detail/dal");
const { loadBusinessName } = await import("../businesses/detail/dal");

const DAY = 86_400_000;
let agency: Awaited<ReturnType<typeof createAgencyWithBusiness>>;

async function setAgency(fields: Database["public"]["Tables"]["agencies"]["Update"]) {
  const { error } = await service.from("agencies").update(fields).eq("id", agency.agencyId);
  if (error) throw error;
}

beforeAll(async () => {
  await signInAs(session, "admin-agency-list", { admin: true });
});
beforeEach(async () => {
  agency = await createAgencyWithBusiness("Agency List");
});
afterAll(deleteTestUsers);

describe("admin agencies list and detail", () => {
  // A name no other run or file uses, so the search finds only this agency.
  const named = async () => {
    const name = `Agency List ${randomUUID()}`;
    await setAgency({ name });
    return name;
  };
  const ids = (list: { rows: { id: string }[] }) => list.rows.map((r) => r.id);

  it("shows an unfinished signup and an ended trial as such, and leaves both out of On trial", async () => {
    const search = await named();
    await setAgency({ status: "trialing", trial_ends_at: null, stripe_subscription_id: null });
    const unfinished = await listAgencies({ filter: "signup_unfinished", search });
    expect(unfinished.rows).toEqual([expect.objectContaining({ id: agency.agencyId, status: "trialing", displayStatus: "signup_unfinished" })]);
    expect(unfinished.counts).toMatchObject({ all: 1, signup_unfinished: 1, trialing: 0, trial_ended: 0, test: 1 });

    await setAgency({ trial_ends_at: new Date(Date.now() - DAY).toISOString(), stripe_subscription_id: `sub_${randomUUID()}` });
    expect(ids(await listAgencies({ filter: "trial_ended", search }))).toEqual([agency.agencyId]);
    expect(ids(await listAgencies({ filter: "trialing", search }))).toEqual([]);

    await setAgency({ trial_ends_at: new Date(Date.now() + DAY).toISOString() });
    expect((await listAgencies({ filter: "trialing", search })).rows[0]?.displayStatus).toBe("trialing");
  });

  it("finds an agency by part of its name or its owner's email, in any case", async () => {
    const name = await named();
    const { data } = await service.auth.admin.getUserById(agency.ownerId);
    const email = data.user!.email!;
    expect(ids(await listAgencies({ search: name.slice(-12).toUpperCase() }))).toEqual([agency.agencyId]);
    expect(ids(await listAgencies({ search: email.split("@")[0] }))).toEqual([agency.agencyId]);
    // Characters that would change the PostgREST filter are only text.
    expect(ids(await listAgencies({ search: `${name.slice(-12)}),name.ilike.(` }))).toEqual([]);
  });

  it("pages 50 agencies at a time, newest first", async () => {
    const first = await listAgencies({ page: 1 });
    expect(first.rows.length).toBeLessThanOrEqual(50);
    expect(first.pages).toBe(Math.max(1, Math.ceil(first.total / 50)));
    const dates = first.rows.map((r) => r.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    if (first.pages > 1) {
      const second = await listAgencies({ page: 2 });
      expect(ids(second).some((id) => ids(first).includes(id))).toBe(false);
    }
  });

  it("names where granted credits came from in the credit history", async () => {
    await grantCredits({ agencyId: agency.agencyId, source: "trial", sourceId: `trial-${randomUUID()}`, amount: 100, expiresAt: new Date(Date.now() + DAY) });
    await grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 50, expiresAt: null });
    const ledger = (await loadAgencyDetail(agency.agencyId))?.ledger ?? [];
    expect(ledger.map((l) => [l.kind, l.source, l.delta])).toEqual(
      expect.arrayContaining([
        ["grant", "trial", 100],
        ["grant", "topup", 50],
      ]),
    );
  });

  it("loads just the names for the page titles", async () => {
    expect(await loadAgencyName(agency.agencyId)).toBe("Agency List");
    expect(await loadBusinessName(agency.businessId)).toBe("Agency List Coffee");
    expect(await loadAgencyName(randomUUID())).toBeNull();
  });
});
