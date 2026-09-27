import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Signals } from "./facts";
import { COFFEE_CHECKS, COFFEE_PLACES_NUMBERS, COFFEE_SIGNALS, COFFEE_SOURCES } from "./fixtures";
import { templateWriter } from "./template-writer";

// B-51 against the local database: after a scan the reasons are stored as opportunities with
// placeholders only (D-73), a new scan replaces the open ones, and the page fills values in live.
vi.setConfig({ testTimeout: 30_000 });

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

const { explainAfterScan, getLiveOpportunities } = await import("./dal");

const fixtureSignals = async (placeId: string): Promise<Signals | null> => COFFEE_SIGNALS.get(placeId) ?? null;
const TEXT = "title, description, evidence, recommended_action, claude_prompt, status";

async function seed(isTest: boolean) {
  const email = `vitest-insights-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Insights test", is_test: isTest })
    .select("id")
    .single()
    .throwOnError();
  const b = COFFEE_SOURCES.business;
  const { data: business } = await service
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.id,
      name: b.name,
      status: "active",
      industry: b.industry,
      domain: b.domain,
      has_website: true,
      primary_city: b.city,
      primary_region: b.region,
      places_id: b.placesId,
      services: b.services,
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: competitors } = await service
    .from("business_competitors")
    .insert(
      COFFEE_SOURCES.competitors.map((c) => ({ business_id: business.id, name: c.name, places_id: c.placesId, source: "confirmed_place", confirmed: true })),
    )
    .select("id, name")
    .throwOnError();
  await service.from("business_site_facts").insert({ business_id: business.id, data: COFFEE_SOURCES.siteFacts as never }).throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { userId: data.user.id, businessId: business.id, competitors, client };
}

async function addRun(businessId: string): Promise<string> {
  const { data: run } = await service
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "openai,anthropic,perplexity", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  await service
    .from("visibility_results")
    .insert(
      COFFEE_CHECKS.map((c, i) => ({
        run_id: run.id,
        business_id: businessId,
        provider: c.provider,
        question: c.question,
        answer_text: `answer ${i}`,
        business_mentioned: c.businessMentioned,
        competitors_mentioned: c.competitorsMentioned as never,
        cited_sources: c.citations as never,
      })),
    )
    .throwOnError();
  return run.id;
}

const opportunities = async (businessId: string) =>
  (await service.from("opportunities").select(TEXT).eq("business_id", businessId).order("created_at").throwOnError()).data!;

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("explainAfterScan", () => {
  it("stores 3 to 5 reasons with placeholders and never a Google value (D-73)", async () => {
    const { businessId, competitors } = await seed(true);
    const result = await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    expect(result.source).toBe("ai");
    const rows = await opportunities(businessId);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.length).toBeLessThanOrEqual(5);
    const text = JSON.stringify(rows);
    const beanHouse = competitors.find((c) => c.name === "Bean House")!;
    expect(text).toContain(`{competitor.${beanHouse.id}.review_count}`);
    for (const n of COFFEE_PLACES_NUMBERS) expect(text).not.toContain(n);
  });

  it("uses the template for a test agency even when a live writer is passed (D-61)", async () => {
    const { businessId } = await seed(true);
    const live = vi.fn(templateWriter);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write: live });
    expect(live).not.toHaveBeenCalled();
  });

  it("replaces open reasons on the next scan and keeps the ones the user dismissed", async () => {
    const { businessId } = await seed(true);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    const first = await opportunities(businessId);
    await service.from("opportunities").update({ status: "dismissed" }).eq("business_id", businessId).eq("title", first[0].title).throwOnError();
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    const second = await opportunities(businessId);
    expect(second.length).toBe(first.length);
    expect(second.filter((o) => o.title === first[0].title).map((o) => o.status)).toEqual(["dismissed"]);
  });

  it("records the writer's cost for a real agency", async () => {
    const { businessId } = await seed(false);
    const write = vi.fn(async (input: Parameters<typeof templateWriter>[0]) => ({
      ...(await templateWriter(input)),
      model: "claude-sonnet-5",
      usage: { inputTokens: 10_000, outputTokens: 2_000 },
    }));
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write });
    expect(write).toHaveBeenCalledTimes(1);
    const { data } = await service.from("usage_events").select("model, estimated_cost_usd").eq("business_id", businessId).throwOnError();
    expect(data).toEqual([{ model: "claude-sonnet-5", estimated_cost_usd: 0.04 }]);
  });
});

describe("getLiveOpportunities", () => {
  it("fills Google values in live for the owner, and nothing for another agency", async () => {
    const { businessId, client } = await seed(true);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    session = client;
    const rows = (await getLiveOpportunities(businessId, fixtureSignals))!;
    expect(rows.map((r) => r.evidence).join("\n")).toContain("On Google, Bean House has 320 reviews and you have 12.");
    expect(JSON.stringify(rows)).not.toMatch(/\{(business|competitor)\./);

    const other = await seed(true);
    session = other.client;
    expect(await getLiveOpportunities(businessId, fixtureSignals)).toBeNull();
    session = null;
  });
});
