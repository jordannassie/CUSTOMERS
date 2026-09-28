import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";

// Direct POSTs to the actions with no session cookie: refused before input or Stripe are touched.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    }),
}));
vi.mock("../stripe", () => ({
  getStripe: () => {
    throw new Error("plan change tests must not reach Stripe");
  },
}));

const actions = await import("./actions");

describe("plan change actions", () => {
  it.each([
    ["upgradeBusiness", actions.upgradeBusiness],
    ["addBusiness", actions.addBusiness],
    ["downgradeBusiness", actions.downgradeBusiness],
    ["removeBusiness", actions.removeBusiness],
    ["cancelSubscription", actions.cancelSubscription],
    ["keepSubscription", actions.keepSubscription],
  ])("%s returns 401 without a session", async (_name, action) => {
    expect(await action({ businessId: "not-checked" })).toEqual({ ok: false, status: 401, error: "Please log in to continue." });
  });
});
