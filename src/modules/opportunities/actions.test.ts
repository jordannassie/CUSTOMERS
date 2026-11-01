import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";

// A direct POST to the actions with no session cookie.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setChecklistItem, setOpportunityStatus } = await import("./actions");

describe("opportunities actions", () => {
  it("return 401 without a session", async () => {
    const denied = { ok: false, status: 401, error: "Please log in to continue." };
    expect(await setOpportunityStatus({ businessId: "x", opportunityId: "y", status: "done" })).toEqual(denied);
    expect(await setChecklistItem({ businessId: "x", key: "website", done: true })).toEqual(denied);
  });
});
