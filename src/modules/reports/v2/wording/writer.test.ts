import { describe, expect, it } from "vitest";
import { anthropicMessage, fakeAiClients, jsonResponse, openaiResponse, providerFetch } from "@/modules/ai";
import { FIX_WORDING_MODEL } from "@/modules/reports/prompts/fix-wording.v1";
import { COFFEE_FIXES, COFFEE_SNAPSHOT, GOOD_COFFEE_WORDING } from "./fixtures";
import { wordFixes } from "./word-fixes";
import { createFixWordingWriter, FIX_WORDING_TASK } from "./writer";

const answer = JSON.stringify(GOOD_COFFEE_WORDING);
const silent = () => {};

describe("fix wording writer", () => {
  it("asks the pinned Claude model once and keeps its checked wording", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(anthropicMessage(answer, { model: FIX_WORDING_MODEL }))] });
    const writer = createFixWordingWriter(fakeAiClients(fetch))!;
    const fixes = await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, log: silent });
    expect(calls.anthropic).toHaveLength(1);
    expect(calls.anthropic[0]).toMatchObject({ model: "claude-sonnet-5" });
    expect(String((calls.anthropic[0].messages as { content: string }[])[0].content)).toContain("own_site_uncited");
    expect(fixes.every((f) => f.wording === "ai")).toBe(true);
  });

  it("falls back to gpt-4.1 when Claude fails (D-84)", async () => {
    const { fetch, calls } = providerFetch({
      anthropic: [jsonResponse({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }, 529)],
      openai: [jsonResponse(openaiResponse(answer, { model: "gpt-4.1-2025-04-14" }))],
    });
    const writer = createFixWordingWriter(fakeAiClients(fetch))!;
    const fixes = await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, log: silent });
    expect(calls.openai[0]).toMatchObject({ model: "gpt-4.1" });
    expect(fixes.every((f) => f.wording === "ai")).toBe(true);
  });

  it("keeps the templates when both providers fail, without throwing", async () => {
    const down = jsonResponse({ type: "error", error: { type: "api_error", message: "down" } }, 500);
    const { fetch } = providerFetch({ anthropic: [down], openai: [jsonResponse({ error: { message: "down" } }, 500)] });
    const writer = createFixWordingWriter(fakeAiClients(fetch))!;
    expect(await wordFixes(COFFEE_FIXES, COFFEE_SNAPSHOT, { writer, log: silent })).toBe(COFFEE_FIXES);
  });

  it("has no writer when no AI key is set, and names its usage task", () => {
    expect(createFixWordingWriter(fakeAiClients(fetch, { anthropicKey: null, openaiKey: null }))).toBeNull();
    expect(FIX_WORDING_TASK).toBe("report_fix_wording");
  });
});
