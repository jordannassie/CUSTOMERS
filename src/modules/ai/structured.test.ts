import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runJob } from "./clients";
import { AiUnavailableError, breakerMs, createBreaker } from "./errors";
import { ANTHROPIC_CREDIT_ERROR, anthropicMessage, fakeAiClients, jsonResponse, openaiResponse, providerFetch } from "./fixtures";
import { aiCostUsd } from "./pricing";

const schema = z.object({ numbers: z.array(z.number().int()) });
const job = { task: "pick_questions", model: "claude-haiku-4-5", system: "Pick.", user: "List", schema, maxTokens: 500, timeoutMs: 5_000 };
const claudeOk = () => jsonResponse(anthropicMessage('{"numbers":[1,2]}'));
const openaiOk = () => jsonResponse(openaiResponse('{"numbers":[3]}'));

describe("runStructured", () => {
  it("uses Claude when it answers, and records no fallback", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [claudeOk()], openai: [openaiOk()] });
    const result = await runJob(fakeAiClients(fetch), job);
    expect(result).toMatchObject({ output: { numbers: [1, 2] }, provider: "anthropic", fellBack: false, primaryError: null });
    expect(result.costUsd).toBe(aiCostUsd("claude-haiku-4-5", { inputTokens: 900, cachedInputTokens: 0, outputTokens: 150 }));
    expect(calls.openai).toHaveLength(0);
    // Same prompt and schema as before: Claude structured outputs.
    expect(calls.anthropic[0]).toMatchObject({ model: "claude-haiku-4-5", system: "Pick.", output_config: { format: { type: "json_schema" } } });
  });

  it("falls back to OpenAI on a credit-balance 400 and opens the circuit for 15 minutes", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(ANTHROPIC_CREDIT_ERROR, 400)], openai: [openaiOk()] });
    const failure = vi.fn();
    const ai = { ...fakeAiClients(fetch), report: { failure } };
    const first = await runJob(ai, job);

    expect(first).toMatchObject({ output: { numbers: [3] }, provider: "openai", model: "gpt-4.1-mini-2025-04-14", fellBack: true });
    expect(first.primaryError).toMatch(/credit 400: .*credit balance is too low/);
    expect(failure).toHaveBeenCalledWith("pick_questions", expect.objectContaining({ provider: "anthropic", kind: "credit" }), true);
    // Same prompt text, strict schema on the OpenAI side.
    expect(calls.openai[0]).toMatchObject({
      model: "gpt-4.1-mini",
      instructions: "Pick.",
      input: "List",
      text: { format: { type: "json_schema", strict: true, name: "pick_questions" } },
    });

    await runJob(ai, job);
    expect(calls.anthropic).toHaveLength(1);
    expect(calls.openai).toHaveLength(2);
    expect(breakerMs("credit")).toBe(15 * 60_000);
  });

  it("falls back on a 429 and skips Claude for 2 minutes only", async () => {
    let now = 0;
    const breaker = createBreaker();
    const { fetch, calls } = providerFetch({
      anthropic: [jsonResponse({ type: "error", error: { type: "rate_limit_error", message: "slow down" } }, 429), claudeOk()],
      openai: [openaiOk()],
    });
    const ai = fakeAiClients(fetch, { breaker });
    const timed = { ...job, now: () => now };
    const run = () => runJob({ ...ai }, timed);
    expect(await run()).toMatchObject({ provider: "openai", fellBack: true });
    now = 60_000;
    expect(await run()).toMatchObject({ provider: "openai" });
    expect(calls.anthropic).toHaveLength(1);
    now = 2 * 60_000 + 1;
    expect(await run()).toMatchObject({ provider: "anthropic", fellBack: false });
  });

  it("retries bad JSON on Claude once, then falls back to OpenAI", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(anthropicMessage('{"numbers":"none"}'))], openai: [openaiOk()] });
    const result = await runJob(fakeAiClients(fetch), job);
    expect(result).toMatchObject({ provider: "openai", fellBack: true });
    expect(result.primaryError).toMatch(/model_fault: returned JSON that does not match the schema/);
    expect(calls.anthropic).toHaveLength(2);
  });

  it("falls back on a timeout or a 5xx too", async () => {
    const { fetch } = providerFetch({ anthropic: [jsonResponse({ type: "error", error: { type: "overloaded_error" } }, 529)], openai: [openaiOk()] });
    expect(await runJob(fakeAiClients(fetch), job)).toMatchObject({ provider: "openai", fellBack: true });
  });

  it("throws a clear error with both reasons when both fail", async () => {
    const { fetch } = providerFetch({
      anthropic: [jsonResponse(ANTHROPIC_CREDIT_ERROR, 400)],
      openai: [jsonResponse({ error: { message: "You exceeded your current quota", type: "insufficient_quota" } }, 429)],
    });
    const err = await runJob(fakeAiClients(fetch), job).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect((err as AiUnavailableError).primary?.kind).toBe("credit");
    expect((err as AiUnavailableError).backup?.kind).toBe("credit");
    expect((err as AiUnavailableError).modelFault).toBe(false);
    expect((err as Error).message).toMatch(/anthropic claude-haiku-4-5 credit.*; openai gpt-4.1-mini credit/);
  });

  it("does not fall back when AI_FALLBACK_ENABLED is false", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(ANTHROPIC_CREDIT_ERROR, 400)], openai: [openaiOk()] });
    const err = await runJob(fakeAiClients(fetch, { fallbackEnabled: false }), job).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect((err as AiUnavailableError).backup).toBeNull();
    expect(calls.openai).toHaveLength(0);
  });

  it("does not fall back on our own bad request, and reports it as a bug", async () => {
    const bad = { type: "error", error: { type: "invalid_request_error", message: "max_tokens: field required" } };
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(bad, 400)], openai: [openaiOk()] });
    const failure = vi.fn();
    const err = await runJob({ ...fakeAiClients(fetch), report: { failure } }, job).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect(failure).toHaveBeenCalledWith("pick_questions", expect.objectContaining({ kind: "bad_request" }), false);
    expect(calls.openai).toHaveLength(0);
  });

  it("uses the smart backup for a Sonnet job", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(ANTHROPIC_CREDIT_ERROR, 400)], openai: [openaiOk()] });
    await runJob(fakeAiClients(fetch), { ...job, model: "claude-sonnet-5" });
    expect(calls.openai[0]).toMatchObject({ model: "gpt-4.1" });
  });
});
