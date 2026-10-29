import { afterAll, describe, expect, it, vi } from "vitest";
import { addRun, deleteTestUsers, fixtureSignals, seed, service } from "./insights.test-helpers";
import { templateWriter } from "./template-writer";
import { explainAfterScan } from "./dal";

// Plan 4.1 and 4.2 against the local database: a fix the next scan suggests again keeps its row (id, created_at), so
// ?fix= links hold and the weekly email does not list it as new; the AI's order is saved as evidence_data.rank.

type Row = { id: string; title: string; description: string | null; status: string; created_at: string; evidence_data: unknown };
const rows = async (businessId: string): Promise<Row[]> =>
  (await service.from("opportunities").select("id, title, description, status, created_at, evidence_data").eq("business_id", businessId).order("created_at").order("id").throwOnError()).data!;
const byTitle = (list: Row[]) => new Map(list.map((r) => [r.title, r]));

const aiWriter = () =>
  vi.fn(async (input: Parameters<typeof templateWriter>[0]) => ({ ...(await templateWriter(input)), model: "claude-sonnet-5", usage: { inputTokens: 1_000, outputTokens: 500 } }));

afterAll(deleteTestUsers);

describe("saving a scan's fixes in place", () => {
  it("keeps the same ids and dates when the next scan suggests the same fixes, and saves the AI's order", async () => {
    const { businessId } = await seed(true);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    const first = await rows(businessId);
    expect(first.length).toBeGreaterThanOrEqual(3);
    const ranks = first.map((r) => (r.evidence_data as { rank?: unknown }).rank);
    expect(ranks.every((r) => Number.isInteger(r))).toBe(true);
    expect(new Set(ranks).size).toBe(first.length);

    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    const second = await rows(businessId);
    expect(second.map((r) => [r.id, r.title, r.created_at, r.evidence_data])).toEqual(first.map((r) => [r.id, r.title, r.created_at, r.evidence_data]));
  });

  it("leaves a fix the user moved to To do as they have it, and does not add it again", async () => {
    const { businessId } = await seed(true);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    const [accepted] = await rows(businessId);
    await service.from("opportunities").update({ status: "todo", description: "The owner's version." }).eq("id", accepted.id).throwOnError();

    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals });
    const after = await rows(businessId);
    expect(after.filter((r) => r.title === accepted.title)).toEqual([{ ...accepted, status: "todo", description: "The owner's version." }]);
  });

  it("never rewrites the AI's fixes when the fixed rules stand in", async () => {
    const { businessId } = await seed(false);
    await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write: aiWriter() });
    const before = await rows(businessId);
    await service.from("opportunities").update({ description: "The AI's text." }).eq("id", before[0].id).throwOnError();

    const empty = vi.fn(async (input: Parameters<typeof templateWriter>[0]) => ({
      ...(await templateWriter(input)),
      output: { reasons: [] },
      model: "claude-sonnet-5",
      usage: { inputTokens: 2_000, outputTokens: 700 },
    }));
    expect((await explainAfterScan(await addRun(businessId), { fetchSignals: fixtureSignals, write: empty })).source).toBe("rules");
    const after = byTitle(await rows(businessId));
    for (const row of before) expect(after.get(row.title)?.id).toBe(row.id);
    expect(after.get(before[0].title)?.description).toBe("The AI's text.");
    // Rules added alongside have no rank, so they list after the AI's fixes of the same impact.
    const added = [...after.values()].filter((r) => !before.some((b) => b.id === r.id));
    for (const row of added) expect(row.evidence_data).toEqual({});
  });
});
