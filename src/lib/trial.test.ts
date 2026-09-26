import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  adminEmails: "",
  profile: { account_type: "admin", trial_starts_at: "2026-01-01", trial_ends_at: "2026-01-15" },
}));

const email = "trial-user@example.test";

// Each query resolves to the table's row: the user's profile, and no subscription.
function fakeClient() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email } }, error: null }) },
    from(table: string) {
      const row = table === "profiles" ? state.profile : null;
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeClient() }));
vi.mock("@/config/product-access", () => ({ PRODUCT_ACCESS: { betaFreeAccess: false, betaLimits: {} } }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return {
    env: new Proxy(env, { get: (target, key) => (key === "ADMIN_EMAILS" ? state.adminEmails : Reflect.get(target, key)) }),
  };
});

const { getTrialStatus } = await import("./trial");

describe("getTrialStatus admin bypass", () => {
  beforeEach(() => {
    state.adminEmails = "";
  });

  it("ignores profiles.account_type = admin", async () => {
    const status = await getTrialStatus();
    expect(status.isAdmin).toBe(false);
    expect(status.isExpired).toBe(true);
  });

  it("grants full access to an email in ADMIN_EMAILS", async () => {
    state.adminEmails = email;
    const status = await getTrialStatus();
    expect(status.isAdmin).toBe(true);
    expect(status.isExpired).toBe(false);
  });
});
