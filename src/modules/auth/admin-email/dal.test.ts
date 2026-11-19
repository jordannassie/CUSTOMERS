import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { adminEmailConfirmed } from "./dal";

// Runs against the local Supabase Auth that `npm test` starts.
const service = createServiceClient();
const confirmedEmail = `vitest-admin-ok-${randomUUID()}@example.test`;
const pendingEmail = `vitest-admin-pending-${randomUUID()}@example.test`;
const ids: string[] = [];

beforeAll(async () => {
  for (const [address, email_confirm] of [[confirmedEmail, true], [pendingEmail, false]] as const) {
    const { data, error } = await service.auth.admin.createUser({ email: address, password: `pw-${randomUUID()}`, email_confirm });
    if (error || !data.user) throw error ?? new Error("no user");
    ids.push(data.user.id);
  }
});
afterAll(async () => {
  for (const id of ids) await service.auth.admin.deleteUser(id);
});

describe("adminEmailConfirmed", () => {
  it("is true for a confirmed address, whatever its case", async () => {
    expect(await adminEmailConfirmed(ids[0], confirmedEmail.toUpperCase())).toBe(true);
  });

  it("is false for an address that is not confirmed", async () => {
    expect(await adminEmailConfirmed(ids[1], pendingEmail)).toBe(false);
  });

  it("is false when the token's address is not the user's (another user's id)", async () => {
    expect(await adminEmailConfirmed(ids[0], pendingEmail)).toBe(false);
  });

  it("is false for a user that does not exist", async () => {
    expect(await adminEmailConfirmed(randomUUID(), confirmedEmail)).toBe(false);
  });
});
