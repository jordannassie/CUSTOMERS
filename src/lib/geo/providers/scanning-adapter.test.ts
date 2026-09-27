import { describe, expect, it, vi } from "vitest";
import type { CheckResult } from "@/modules/scanning";

const runCheck = vi.fn(
  async (): Promise<CheckResult> => ({
    answerText: "1. Ace Plumbing in Orange\n2. Rival Pipes",
    citations: [{ url: "https://aceplumbing.example/", title: null }],
    model: "claude-haiku-4-5",
    usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, searchCalls: 1 },
    costUsd: 0.01,
    latencyMs: 3,
  }),
);

vi.mock("@/modules/scanning", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/scanning")>()),
  liveCheckRunner: () => runCheck,
}));

const { getProvider } = await import("./index");

// B-26, BUG-016: the old visibility flow runs Claude and Perplexity again, on the new adapters.
describe("old visibility providers", () => {
  it("runs Claude through the new check with the business location and mention detection v2", async () => {
    const claude = getProvider("anthropic");
    expect(claude?.isConfigured()).toBe(true);

    const result = await claude!.run("best plumber in Orange", {
      businessName: "Ace Plumbing",
      domain: null,
      city: "Orange",
      region: "CA",
      country: "United States",
      competitorNames: ["Rival Pipes", "Space Heaters"],
    });

    expect(runCheck).toHaveBeenCalledWith({
      question: "best plumber in Orange",
      location: { city: "Orange", region: "CA", country: "US" },
      model: "claude-haiku-4-5",
    });
    expect(result).toMatchObject({
      provider: "anthropic",
      businessMentioned: true,
      mentionPosition: 1,
      competitorsMentioned: [{ name: "Rival Pipes" }],
      citedSources: [{ url: "https://aceplumbing.example/" }],
    });
  });

  it("has an adapter for every check provider", () => {
    for (const id of ["openai", "anthropic", "perplexity"] as const) expect(getProvider(id)?.id).toBe(id);
  });
});
