import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { activeCount, createOwner, deleteTestUsers, service } from "../questions.test-helpers";

// BUG-279 against the local database: the plan limit holds when two requests arrive at once.

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { insertQuestion, updateQuestionActive } = await import("../dal");

afterAll(deleteTestUsers);

describe("the question limit under quick clicks (BUG-279)", () => {
  it("adds only one of two different questions at one below the limit", async () => {
    const owner = await createOwner(24);
    session = owner.client;
    const results = await Promise.all([
      insertQuestion(owner.agencyId, owner.businessId, "Best cold brew in Orange?"),
      insertQuestion(owner.agencyId, owner.businessId, "Best iced latte in Orange?"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, status: 403, error: expect.stringContaining("25 questions") });
    expect(await activeCount(owner.businessId)).toBe(25);
  });

  it("adds the same question once when it is sent twice at once", async () => {
    const owner = await createOwner(1);
    session = owner.client;
    const results = await Promise.all([
      insertQuestion(owner.agencyId, owner.businessId, "Best cold brew in Orange?"),
      insertQuestion(owner.agencyId, owner.businessId, "Best cold brew in Orange?"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, status: 400 });
    expect(await activeCount(owner.businessId)).toBe(2);
  });

  it("resumes only up to the limit when resumes arrive at once, and refuses a resume at the limit", async () => {
    const owner = await createOwner(26);
    session = owner.client;
    const paused = owner.questionIds.slice(0, 3);
    await service.from("tracked_prompts").update({ active: false }).in("id", paused).throwOnError();
    // 23 active: three resumes at once leave exactly 25.
    const results = await Promise.all(paused.map((id) => updateQuestionActive(owner.agencyId, owner.businessId, id, true)));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, status: 403 });
    expect(await activeCount(owner.businessId)).toBe(25);
    const left = paused[results.findIndex((r) => !r.ok)];
    expect(await updateQuestionActive(owner.agencyId, owner.businessId, left, true)).toMatchObject({ ok: false, status: 403 });
    expect(await activeCount(owner.businessId)).toBe(25);
  });
});
