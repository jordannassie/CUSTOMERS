import { describe, expect, it } from "vitest";
import { buildExplainInput } from "./facts";
import { COFFEE_SOURCES } from "./fixtures";
import { EXPLAIN_MODEL } from "./prompts/explain.v1";
import { createExplanationWriter, explainRequest, ExplainError } from "./writer";

// No real call: a fake fetch plays the Messages API (keys are treated as exposed until B-01).
function fakeFetch(body: object, calls: unknown[] = []): typeof fetch {
  return (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const message = (text: string, stop_reason = "end_turn") => ({
  id: "msg_fixture",
  type: "message",
  role: "assistant",
  model: EXPLAIN_MODEL,
  content: [{ type: "text", text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 2100, output_tokens: 900 },
});

const { input } = buildExplainInput(COFFEE_SOURCES);

describe("explanation writer", () => {
  it("asks claude-sonnet-5 for structured output with the v1 prompt", () => {
    const req = explainRequest(input);
    expect(req.model).toBe("claude-sonnet-5");
    expect(req.output_config.format.type).toBe("json_schema");
    expect(req.messages[0].content).toContain('"name": "Sunrise Coffee Bar"');
  });

  it("parses the reasons and reports usage", async () => {
    const calls: unknown[] = [];
    const write = createExplanationWriter("test-key", { fetch: fakeFetch(message('{"reasons":[]}'), calls) });
    await expect(write(input)).resolves.toEqual({ output: { reasons: [] }, model: EXPLAIN_MODEL, usage: { inputTokens: 2100, outputTokens: 900 } });
    expect(calls).toHaveLength(1);
  });

  it("marks refusals and bad JSON as model faults", async () => {
    const refused = createExplanationWriter("test-key", { fetch: fakeFetch(message("", "refusal")) });
    await expect(refused(input)).rejects.toMatchObject({ name: "ExplainError", modelFault: true });
    const bad = createExplanationWriter("test-key", { fetch: fakeFetch(message('{"reasons":"none"}')) });
    await expect(bad(input)).rejects.toBeInstanceOf(ExplainError);
  });
});
