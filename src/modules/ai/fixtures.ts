// Hand-built Anthropic Messages and OpenAI Responses bodies, and a fake fetch that answers each provider by URL,
// for tests across modules. No real call is made anywhere these are used.
import { createAiClients, type AiClientOptions, type AiClients } from "./clients";
import { createBreaker } from "./errors";

export function anthropicMessage(text: string, extra: Record<string, unknown> = {}) {
  return {
    id: "msg_fixture",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 900, output_tokens: 150 },
    ...extra,
  };
}

export function openaiResponse(text: string, extra: { refusal?: string; incompleteReason?: string; model?: string } = {}) {
  const content =
    extra.refusal !== undefined ? [{ type: "refusal", refusal: extra.refusal }] : [{ type: "output_text", text, annotations: [] }];
  return {
    id: "resp_fixture",
    object: "response",
    created_at: 1_760_000_000,
    status: extra.incompleteReason ? "incomplete" : "completed",
    incomplete_details: extra.incompleteReason ? { reason: extra.incompleteReason } : null,
    model: extra.model ?? "gpt-4.1-mini-2025-04-14",
    output: [{ type: "message", id: "msg_fixture", status: "completed", role: "assistant", content }],
    usage: { input_tokens: 900, input_tokens_details: { cached_tokens: 0 }, output_tokens: 150, total_tokens: 1050 },
  };
}

export const ANTHROPIC_CREDIT_ERROR = {
  type: "error",
  error: {
    type: "invalid_request_error",
    message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
  },
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Answer = Response | ((body: Record<string, unknown>) => Response);

/** A fetch that sends Anthropic and OpenAI calls to their own answers, in order, and records every request body. */
export function providerFetch(answers: { anthropic?: Answer[]; openai?: Answer[] }) {
  const calls = { anthropic: [] as Record<string, unknown>[], openai: [] as Record<string, unknown>[] };
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const provider = url.includes("anthropic.com") ? "anthropic" : url.includes("openai.com") ? "openai" : null;
    if (!provider) throw new Error(`Unexpected fetch to ${url}`);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls[provider].push(body);
    const queue = answers[provider] ?? [];
    const answer = queue.length > 1 ? queue.shift()! : queue[0];
    if (!answer) throw new Error(`No fake ${provider} answer left`);
    return typeof answer === "function" ? answer(body) : answer.clone();
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

/** Clients over a fake fetch, with their own breaker so tests never share state, and no SDK retries. */
export function fakeAiClients(fetch: typeof globalThis.fetch, opts: Partial<AiClientOptions> = {}): AiClients {
  return createAiClients({ anthropicKey: "sk-ant-test", openaiKey: "sk-test", fetch, maxRetries: 0, breaker: createBreaker(), ...opts });
}
