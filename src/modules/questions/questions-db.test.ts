import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-53 against the local database: the Server Actions check auth, input, ownership and the plan limit themselves.

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
const { loadQuestionAnswers } = await import("./reads/dal");

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
    expect(await removeQuestion({ businessId: owner.businessId, questionId: q2 })).toMatchObject({ ok: true });
    // Removed, not deleted: it leaves every list but keeps its answers for past scores (step 9e).
    const { data } = await service.from("tracked_prompts").select("id").eq("business_id", owner.businessId).is("removed_at", null);
    expect(data).toEqual([{ id: q1 }]);
    const { data: removed } = await service.from("tracked_prompts").select("active, inactive_since, removed_at").eq("id", q2).single();
    expect(removed).toMatchObject({ active: false });
    expect(removed?.removed_at).not.toBeNull();
    expect(removed?.inactive_since).not.toBeNull();
  });
});

describe("editQuestion (M2)", () => {
  const rows = async (businessId: string) =>
    (
      await service
        .from("tracked_prompts")
        .select("id, prompt, source, active, inactive_since, removed_at")
        .eq("business_id", businessId)
        .order("created_at")
        .throwOnError()
    ).data;

  async function answer(businessId: string, questionId: string) {
    const { data: run } = await service.from("visibility_runs").insert({ business_id: businessId, provider: "scan", status: "completed" }).select("id").single().throwOnError();
    await service
      .from("visibility_results")
      .insert({ run_id: run.id, business_id: businessId, tracked_prompt_id: questionId, provider: "openai", business_mentioned: true, competitors_mentioned: [], answer_text: "Bean There." })
      .throwOnError();
  }

  it("saves a suggested question's new wording as a new question and pauses the old one with its answers", async () => {
    const owner = await createOwner(2);
    session = owner.client;
    const [q1] = owner.questionIds;
    await answer(owner.businessId, q1);
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "best latte in Orange" })).toEqual({ ok: true, data: { newQuestion: true } });
    const after = await rows(owner.businessId);
    const old = after!.find((q) => q.id === q1)!;
    expect(old).toMatchObject({ prompt: "Question 1 in Orange?", source: "library", active: false, removed_at: null });
    expect(old.inactive_since).not.toBeNull();
    const added = after!.find((q) => q.prompt === "Best latte in Orange?")!;
    expect(added).toMatchObject({ source: "custom", active: true, inactive_since: null });
    // The old answers stay with the old wording.
    const { count } = await service.from("visibility_results").select("id", { count: "exact", head: true }).eq("tracked_prompt_id", q1);
    expect(count).toBe(1);
    expect(await activeCount(owner.businessId)).toBe(2);
    // The page lists both: the new one active, the old one paused.
    const view = await loadQuestionsPage(owner.agencyId, owner.businessId, new Date());
    expect(view!.active.map((q) => q.text)).toEqual(["Question 2 in Orange?", "Best latte in Orange?"]);
    expect(view!.paused.map((q) => q.text)).toEqual(["Question 1 in Orange?"]);
  });

  it("works at the plan limit, since the new question takes the old one's place", async () => {
    const owner = await createOwner(25);
    session = owner.client;
    expect(await editQuestion({ businessId: owner.businessId, questionId: owner.questionIds[0], text: "Best latte in Orange?" })).toMatchObject({ ok: true });
    expect(await activeCount(owner.businessId)).toBe(25);
  });

  it("keeps a paused question's copy paused", async () => {
    const owner = await createOwner(1);
    session = owner.client;
    const [q1] = owner.questionIds;
    await setQuestionActive({ businessId: owner.businessId, questionId: q1, active: false });
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "Best latte in Orange?" })).toMatchObject({ ok: true, data: { newQuestion: true } });
    expect((await rows(owner.businessId))!.map((q) => [q.source, q.active])).toEqual([["library", false], ["custom", false]]);
  });

  it("refuses wording another question already has, paused ones included, and does nothing for the same wording", async () => {
    const owner = await createOwner(2);
    session = owner.client;
    const [q1, q2] = owner.questionIds;
    await setQuestionActive({ businessId: owner.businessId, questionId: q2, active: false });
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "question 2 in orange" })).toMatchObject({ ok: false, status: 400 });
    expect(await editQuestion({ businessId: owner.businessId, questionId: q1, text: "Question 1 in Orange" })).toEqual({ ok: true, data: { newQuestion: false } });
    expect((await rows(owner.businessId))!.length).toBe(2);
  });

  it("rewrites the user's own question in place until it has answers, then saves a new one", async () => {
    const owner = await createOwner(0);
    session = owner.client;
    await addQuestion({ businessId: owner.businessId, text: "Best cold brew in Orange?" });
    const [own] = (await rows(owner.businessId))!;
    expect(await editQuestion({ businessId: owner.businessId, questionId: own.id, text: "Best iced coffee in Orange?" })).toEqual({ ok: true, data: { newQuestion: false } });
    expect((await rows(owner.businessId))!.map((q) => [q.id, q.prompt, q.active])).toEqual([[own.id, "Best iced coffee in Orange?", true]]);

    await answer(owner.businessId, own.id);
    expect(await editQuestion({ businessId: owner.businessId, questionId: own.id, text: "Best iced latte in Orange?" })).toEqual({ ok: true, data: { newQuestion: true } });
    expect((await rows(owner.businessId))!.map((q) => [q.prompt, q.source, q.active])).toEqual([
      ["Best iced coffee in Orange?", "custom", false],
      ["Best iced latte in Orange?", "custom", true],
    ]);
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

describe("loadQuestionAnswers (BUG-089)", () => {
  it("gives the latest answer per model, and nothing for another agency", async () => {
    const owner = await createOwner(1);
    const other = await createOwner(1);
    const [questionId] = owner.questionIds;
    const { data: run } = await service.from("visibility_runs").insert({ business_id: owner.businessId, provider: "scan", status: "completed" }).select("id").single().throwOnError();
    const result = (provider: string, hoursAgo: number, text: string, mentioned: boolean) => ({
      id: randomUUID(),
      run_id: run.id,
      business_id: owner.businessId,
      tracked_prompt_id: questionId,
      provider,
      created_at: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
      business_mentioned: mentioned,
      competitors_mentioned: [],
      answer_text: text,
    });
    await service.from("visibility_results").insert([result("openai", 30, "Older ChatGPT answer.", false), result("openai", 2, "Newest ChatGPT answer.", true)]).throwOnError();

    const answers = await loadQuestionAnswers(owner.agencyId, owner.businessId, questionId);
    expect(answers?.map((a) => [a.model, a.text, a.namedYou])).toEqual([["openai", "Newest ChatGPT answer.", true]]);
    expect(await loadQuestionAnswers(other.agencyId, owner.businessId, questionId)).toBeNull();
    expect(await loadQuestionAnswers(owner.agencyId, owner.businessId, other.questionIds[0])).toBeNull();
  });
});

