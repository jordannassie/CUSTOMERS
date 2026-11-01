import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";

// A direct POST to the action with no session cookie.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    }),
}));

const { renameBusiness } = await import("./actions");

describe("renameBusiness", () => {
  it("returns 401 without a session and does not touch the input", async () => {
    const result = await renameBusiness({ businessId: "not-checked", name: "" });
    expect(result).toEqual({ ok: false, status: 401, error: "Please log in to continue." });
  });
});
