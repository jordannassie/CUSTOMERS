import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-53 against the local database: the Server Actions check auth, input, ownership and the plan limit themselves.
vi.setConfig({ testTimeout: 30_000 });

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { addQuestion, editQuestion, removeQuestion, setQuestionActive } = await import("./actions");
const { loadQuestionsPage } = await import("./dal");

async function createOwner(questions: number) {
  const email = `vitest-questions-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Questions test", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Bean There", status: "active", models: ["openai", "anthropic"] })
    .select("id")
    .single()
    .throwOnError();
  const rows = [];
  for (let i = 0; i < questions; i++) {
    const { data: row } = await service
      .from("tracked_prompts")
      .insert({ business_id: business.id, prompt: `Question ${i + 1} in Orange?`, source: "library", created_at: new Date(Date.now() - (questions - i) * 1000).toISOString() })
      .select("id")
      .single()
      .throwOnError();
    rows.push(row);
  }
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { agencyId: agency.id, businessId: business.id, questionIds: rows.map((r) => r.id), client };
}

const activeCount = async (businessId: string) =>
  (await service.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true)).count;

beforeEach(() => {
  session = null;
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("question actions", () => {
  it("refuse a signed-out caller and bad input", async () => {
    const owner = await createOwner(1);
    expect(await addQuestion({ businessId: owner.businessId, text: "Best cafe in Orange?" })).toMatchObject({ ok: false, status: 401 });
    session = owner.client;
    expect(await addQuestion({ businessId: owner.businessId, text: "hi" })).toMatchObject({ ok: false, status: 400 });
    expect(await setQuestionActive({ businessId: "nope", questionId: owner.questionIds[0], active: false })).toMatchObject({ ok: false, status: 400 });
  });

  it("add a tidy custom question and refuse a repeat", async () => {
    const owner = await createOwner(1);
    session = owner.client;
    expect(await addQuestion({ businessId: owner.businessId, text: "  best  cold brew in Orange " })).toEqual({ ok: true, data: null });
    expect(await addQuestion({ businessId: owner.businessId, text: "Best cold brew in orange?" })).toMatchObject({ ok: false, status: 400 });
    const { data } = await service.from("tracked_prompts").select("prompt, source, active").eq("business_id", owner.businessId).eq("source", "custom");
    expect(data).toEqual([{ prompt: "Best cold brew in Orange?", source: "custom", active: true }]);
  });

  it("enforce the plan limit on add and resume, not on pause", async () => {
    const owner = await createOwner(25);
    session = owner.client;
    expect(await addQuestion({ businessId: owner.businessId, text: "One more question in Orange?" })).toMatchObject({ ok: false, status: 403 });
    const [first] = owner.questionIds;
    expect(await setQuestionActive({ businessId: owner.businessId, questionId: first, active: false })).toMatchObject({ ok: true });
    expect(await addQuestion({ businessId: owner.businessId, text: "One more question in Orange?" })).toMatchObject({ ok: true });
    expect(await setQuestionActive({ businessId: owner.businessId, questionId: first, active: true })).toMatchObject({ ok: false, status: 403 });
    expect(await activeCount(owner.businessId)).toBe(25);
  });

  it("edit and remove only the caller's own questions", async () => {
    const owner = await createOwner(2);
    const other = await createOwner(1);
    session = other.client;
    const [q1, q2] = owner.questionIds;
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "Taken over in Orange?" })).toMatchObject({ status: 404 });
    expect(await removeQuestion({ businessId: owner.businessId, questionId: q1 })).toMatchObject({ status: 404 });
    // Another business's question id under the caller's own business is not found either.
    expect(await removeQuestion({ businessId: other.businessId, questionId: q1 })).toMatchObject({ status: 404 });

    session = owner.client;
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "Question 2 in Orange?" })).toMatchObject({ status: 400 });
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "Best latte in Orange" })).toMatchObject({ ok: true });
    expect(await removeQuestion({ businessId: owner.businessId, questionId: q2 })).toMatchObject({ ok: true });
    const { data } = await service.from("tracked_prompts").select("id, prompt, source").eq("business_id", owner.businessId);
    expect(data).toEqual([{ id: q1, prompt: "Best latte in Orange?", source: "custom" }]);
  });
});

describe("loadQuestionsPage", () => {
  it("hides other agencies' businesses and reads the plan limit", async () => {
    const owner = await createOwner(2);
    const other = await createOwner(0);
    expect(await loadQuestionsPage(other.agencyId, owner.businessId, new Date())).toBeNull();
    const view = await loadQuestionsPage(owner.agencyId, owner.businessId, new Date());
    expect(view).toMatchObject({ limit: 25, frequency: "weekly", models: [{ id: "openai" }, { id: "anthropic" }] });
    expect(view!.active.map((q) => q.text)).toEqual(["Question 1 in Orange?", "Question 2 in Orange?"]);
  });
});
