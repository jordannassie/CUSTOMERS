import { describe, expect, it } from "vitest";
import { buildExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";
import { ANTHROPIC_CREDIT_ERROR, anthropicMessage, fakeAiClients, jsonResponse, openaiResponse, providerFetch } from "@/modules/ai";
import { EXPLAIN_MODEL, explainOutput } from "./prompts/explain.v2";
import { createExplanationWriter, explainRequest, ExplainError } from "./writer";

// No real call: a fake fetch plays the Messages API and, as the backup, the OpenAI Responses API.
const message = (text: string, stop_reason = "end_turn") =>
  anthropicMessage(text, { model: EXPLAIN_MODEL, stop_reason, usage: { input_tokens: 2100, output_tokens: 900 } });

const { input } = buildExplainInput(COFFEE_SOURCES);

describe("explanation writer", () => {
  it("asks claude-sonnet-5 for structured output with the v2 prompt", () => {
    const req = explainRequest(input);
    expect(req.model).toBe("claude-sonnet-5");
    expect(req.schema).toBe(explainOutput);
    expect(req.user).toContain('"name": "Sunrise Coffee Bar"');
  });

  it("parses the reasons and reports usage", async () => {
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(message('{"reasons":[]}'))] });
    const write = createExplanationWriter(fakeAiClients(fetch));
    await expect(write(input)).resolves.toEqual({
      output: { reasons: [] },
      model: EXPLAIN_MODEL,
      usage: { inputTokens: 2100, outputTokens: 900 },
      writer: { provider: "anthropic", fellBack: false, primaryError: null },
    });
    expect(calls.anthropic).toHaveLength(1);
    expect(calls.anthropic[0]).toMatchObject({ model: "claude-sonnet-5", output_config: { format: { type: "json_schema" } } });
  });

  it("uses gpt-4.1 when Claude is out of credit, with the same prompt and schema", async () => {
    const { fetch, calls } = providerFetch({
      anthropic: [jsonResponse(ANTHROPIC_CREDIT_ERROR, 400)],
      openai: [jsonResponse(openaiResponse('{"reasons":[]}', { model: "gpt-4.1-2025-04-14" }))],
    });
    const written = await createExplanationWriter(fakeAiClients(fetch))(input);
    expect(written).toMatchObject({ output: { reasons: [] }, model: "gpt-4.1-2025-04-14", writer: { provider: "openai", fellBack: true } });
    expect(calls.openai[0]).toMatchObject({ model: "gpt-4.1", instructions: calls.anthropic[0].system, input: explainRequest(input).user });
  });

  it("marks refusals and bad JSON as model faults when the backup is off", async () => {
    const refusedFetch = providerFetch({ anthropic: [jsonResponse(message("", "refusal"))] }).fetch;
    const refused = createExplanationWriter(fakeAiClients(refusedFetch, { fallbackEnabled: false }));
    await expect(refused(input)).rejects.toMatchObject({ name: "ExplainError", modelFault: true });
    const badFetch = providerFetch({ anthropic: [jsonResponse(message('{"reasons":"none"}'))] }).fetch;
    const bad = createExplanationWriter(fakeAiClients(badFetch, { fallbackEnabled: false }));
    await expect(bad(input)).rejects.toBeInstanceOf(ExplainError);
  });
});
