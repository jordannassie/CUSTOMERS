import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fakeClients } from "../../../fixtures";
import { COFFEE_FULL_BUSINESS, COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "../../../question-fixtures";
import type { QuestionClients } from "../../../questions";

// Against the local database: the first questions start when the details step is saved (2026-10-29), and the
// questions step then reads them instead of asking Claude while the user waits.
const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ?? createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { saveAgency, startBusiness } = await import("../../dal");
const { saveDetails } = await import("../../details/dal");
const { loadQuestionsStep } = await import("../dal");
const { shownQuestions, warmFirstQuestions } = await import("./dal");

async function draft(): Promise<{ userId: string; id: string }> {
  const email = `vitest-first-set-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  session = client;
  await saveAgency(data.user.id, "Blue Door Marketing", null);
  const started = await startBusiness(data.user.id, { domain: "sunrise-coffee.example" }, fakeClients().clients);
  if (!started.ok) throw new Error("website step failed");
  expect(await saveDetails(data.user.id, details(started.businessId))).toBe(true);
  return { userId: data.user.id, id: started.businessId };
}

// Offers everything the fixture library asks about, so the model is asked to pick.
const details = (businessId: string, city = "Springfield") => ({
  businessId,
  name: "Sunrise Coffee",
  industry: "coffee_shop",
  description: COFFEE_FULL_BUSINESS.description,
  services: COFFEE_FULL_BUSINESS.services,
  city,
  state: "IL",
  country: "US",
  phone: "",
});

const coffee = () => fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK });
const active = async (id: string) =>
  ((await service.from("tracked_prompts").select("prompt").eq("business_id", id).eq("active", true).throwOnError()).data ?? []).map((q) => q.prompt);

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("warmFirstQuestions", () => {
  it("saves the first set, which the questions step then shows without asking the model", async () => {
    const { userId, id } = await draft();
    const first = coffee();
    expect(await warmFirstQuestions(userId, id, first.clients)).toBe("saved");
    expect(first.calls.pick).toBe(1);
    const saved = await active(id);
    expect(saved).toHaveLength(12);

    const later = coffee();
    const step = await loadQuestionsStep(userId, id, later.clients);
    expect(step).toMatchObject({ questions: saved, updated: false });
    expect(later.calls).toEqual({ pick: 0, write: 0 });
  });

  it("does nothing when the business has questions already", async () => {
    const { userId, id } = await draft();
    expect(await warmFirstQuestions(userId, id, coffee().clients)).toBe("saved");
    const again = coffee();
    expect(await warmFirstQuestions(userId, id, again.clients)).toBe("skipped");
    expect(again.calls).toEqual({ pick: 0, write: 0 });
    expect(await active(id)).toHaveLength(12);
  });

  it("keeps nothing when the model failed, so the questions step tries again", async () => {
    const { userId, id } = await draft();
    const failing = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: new Error("down"), write: new Error("down") });
    expect(await warmFirstQuestions(userId, id, failing.clients)).toBe("skipped");
    expect(await active(id)).toEqual([]);
  });

  it("keeps nothing when the details changed while it ran", async () => {
    const { userId, id } = await draft();
    const base = coffee().clients;
    const moving: QuestionClients = {
      ...base,
      model: {
        ...base.model,
        // The user goes Back and saves another city while the set is being made.
        pick: async (input) => {
          await service.from("businesses").update({ primary_city: "Peoria" }).eq("id", id).throwOnError();
          return base.model.pick(input);
        },
      },
    };
    expect(await warmFirstQuestions(userId, id, moving)).toBe("skipped");
    expect(await active(id)).toEqual([]);
  });

  it("is refused for a business that is not the user's draft", async () => {
    const { id } = await draft();
    expect(await warmFirstQuestions(randomUUID(), id, coffee().clients)).toBe("skipped");
    expect(await active(id)).toEqual([]);
  });
});

describe("shownQuestions", () => {
  const rows = [
    { prompt: "Which bagel place in Springfield is open late?", source: "library" },
    { prompt: "Which coffee shop in Springfield has the best espresso?", source: "library" },
    { prompt: "Does Bagel Place deliver?", source: "custom" },
  ];
  const rivals = [{ name: "Bagel Place", aliases: null }];

  it("leaves out a suggestion naming a competitor until the step is saved, never the user's own", () => {
    expect(shownQuestions(rows, rivals, "Springfield", 6)).toEqual([rows[1].prompt, rows[2].prompt]);
  });

  it("shows everything once the step is saved, or with no competitors", () => {
    expect(shownQuestions(rows, rivals, "Springfield", 7)).toEqual(rows.map((r) => r.prompt));
    expect(shownQuestions(rows, [], "Springfield", 6)).toEqual(rows.map((r) => r.prompt));
  });
});
