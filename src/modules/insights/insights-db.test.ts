import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { COFFEE_PLACES_NUMBERS } from "./fixtures";
import { addRun, deleteTestUsers, fixtureSignals, opportunities, seed, service } from "./insights.test-helpers";
import { templateWriter } from "./template-writer";

// B-51 against the local database: after a scan the reasons are stored as opportunities with
// placeholders only (D-73), a new scan replaces the open ones, and the page fills values in live.

let session: SupabaseClient | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));

// Google Places itself: a test agency's scan must never call it (D-61).
const fetchPlaceSignals = vi.hoisted(() => vi.fn(async () => null));
vi.mock("@/modules/competitors/server", async (original) => ({ ...(await original<object>()), fetchPlaceSignals }));

const { explainAfterScan, getLiveOpportunities } = await import("./dal");

afterAll(deleteTestUsers);

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
    // Placeholder ids are random UUIDs, which can contain a run like 320 by chance.
    const values = text.replace(/\{(?:business|competitor)\.[^{}]*\}/g, "");
    for (const n of COFFEE_PLACES_NUMBERS) expect(values).not.toContain(n);
  });

  it("uses the template for a test agency even when a live writer is passed (D-61)", async () => {
    const { businessId } = await seed(true);
    const live = vi.fn(templateWriter);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write: live });
    expect(live).not.toHaveBeenCalled();
  });

  it("never asks Google Places for a test agency's scan (D-61)", async () => {
    const { businessId } = await seed(true);
    fetchPlaceSignals.mockClear();
    expect((await explainAfterScan(await addRun(businessId))).drafts.length).toBeGreaterThan(0);
    expect(fetchPlaceSignals).not.toHaveBeenCalled();
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

// 2026-10-14, Car4Tune: a scan and a rescan two minutes apart explained in parallel, the AI reasons failed the checks,
// and the business was left with 1 fix and no record of why.
describe("explaining two scans close together", () => {
  const explainedAt = async (runId: string) => (await service.from("visibility_runs").select("explained_at").eq("id", runId).single().throwOnError()).data.explained_at;
  const finish = (runId: string, at: Date) => service.from("visibility_runs").update({ completed_at: at.toISOString() }).eq("id", runId).throwOnError();

  it("never lets the older scan, explained last, replace the newer scan's fixes, and marks both explained", async () => {
    const { businessId } = await seed(true);
    const [older, newer] = [await addRun(businessId), await addRun(businessId)];
    await finish(older, new Date(Date.now() - 60_000));
    await finish(newer, new Date());
    expect((await explainAfterScan(newer, { fetchSignals: fixtureSignals })).saved).toBe("saved");
    const fromNewer = await opportunities(businessId);
    expect((await explainAfterScan(older, { fetchSignals: fixtureSignals })).saved).toBe("superseded");
    expect(await opportunities(businessId)).toEqual(fromNewer);
    expect(await explainedAt(older)).not.toBeNull();
    expect(await explainedAt(newer)).not.toBeNull();
  });

  it("keeps the earlier fixes when the rules stand in, logs why to provider_errors and records the cost", async () => {
    const { businessId } = await seed(false);
    const ai = vi.fn(async (input: Parameters<typeof templateWriter>[0]) => ({ ...(await templateWriter(input)), model: "claude-sonnet-5", usage: { inputTokens: 1_000, outputTokens: 500 } }));
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write: ai });
    const before = await opportunities(businessId);
    expect(before.length).toBeGreaterThanOrEqual(3);

    // The writer answers, but none of its reasons passes the checks.
    const empty = vi.fn(async (input: Parameters<typeof templateWriter>[0]) => ({
      ...(await templateWriter(input)),
      output: { reasons: [] },
      model: "claude-sonnet-5",
      usage: { inputTokens: 2_000, outputTokens: 700 },
    }));
    const result = await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write: empty });
    expect(result.source).toBe("rules");
    const after = await opportunities(businessId);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    expect(after.map((o) => o.title)).toEqual(expect.arrayContaining(before.map((o) => o.title)));

    const { data: logged } = await service.from("provider_errors").select("message").like("message", "Why competitors win fell back to the fixed rules: only 0 of 0%").throwOnError();
    expect(logged!.length).toBeGreaterThan(0);
    const { data: usage } = await service.from("usage_events").select("input_tokens").eq("business_id", businessId).order("created_at").throwOnError();
    expect(usage!.map((u) => u.input_tokens)).toEqual([1_000, 2_000]);
  });

  it("marks the run explained even when explaining fails, so the pages stop waiting", async () => {
    const { businessId } = await seed(true);
    const run = await addRun(businessId);
    await expect(
      explainAfterScan(run, {
        fetchSignals: fixtureSignals,
        now: () => {
          throw new Error("clock broke");
        },
      }),
    ).rejects.toThrow("clock broke");
    expect(await explainedAt(run)).not.toBeNull();
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
