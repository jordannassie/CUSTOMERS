import "server-only";
// Claude checks through the Anthropic Messages API with web search and the business location
// (MVP_SPEC 5.1, D-67). The API key is passed in; only a dal.ts reads secrets.
import Anthropic from "@anthropic-ai/sdk";
import { CHECK_MODELS } from "./models";
import { checkCostUsd } from "./pricing";
import {
  ProviderError,
  TIMEOUT_MS,
  httpFailure,
  transportFailure,
  withRetries,
  type Attempt,
  type RequestDeps,
} from "./request";
import type { CheckInput, CheckResult, Citation, RunCheck } from "./types";
import { cleanUrl } from "./urls";

const MAX_OUTPUT_TOKENS = 2_000;
const MAX_SEARCHES = 3;

export function createAnthropicCheck(apiKey: string, deps: RequestDeps = {}): RunCheck {
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  // Retries run through withRetries so every provider shares one policy (REL-01).
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 0, timeout: timeoutMs });

  return async (input: CheckInput): Promise<CheckResult> => {
    const model = CHECK_MODELS.anthropic;
    if (input.model !== model) throw new Error(`Claude adapter only runs ${model}, not ${input.model}`);

    const started = performance.now();
    const message = await withRetries(async (attempt): Promise<Attempt<Anthropic.Message>> => {
      try {
        return { ok: true, value: await client.messages.create(requestBody(input)) };
      } catch (err) {
        return classify(err, attempt, timeoutMs);
      }
    }, deps);
    const latencyMs = Math.round(performance.now() - started);

    return toResult(message, latencyMs);
  };
}

export function requestBody({ question, location, model }: CheckInput): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: "user", content: question }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: MAX_SEARCHES,
        user_location: { type: "approximate", city: location.city, region: location.region, country: location.country },
      },
    ],
  };
}

export function classify(err: unknown, attempt: number, timeoutMs: number): Attempt<never> {
  // The timeout error extends the connection error, so it is checked first.
  if (err instanceof Anthropic.APIConnectionTimeoutError) return transportFailure("anthropic", err, attempt, timeoutMs, true);
  if (err instanceof Anthropic.APIConnectionError) return transportFailure("anthropic", err, attempt, timeoutMs, false);
  if (err instanceof Anthropic.APIError && typeof err.status === "number") {
    return httpFailure("anthropic", err.status, err.message, attempt, err.headers?.get("retry-after") ?? null);
  }
  const error = new ProviderError({
    provider: "anthropic",
    kind: "bad_response",
    attempts: attempt,
    cause: err,
    message: "Unexpected Claude response",
  });
  return { ok: false, error };
}

function toResult(message: Anthropic.Message, latencyMs: number): CheckResult {
  const fail = (kind: "server" | "search" | "bad_response", reason: string) =>
    new ProviderError({ provider: "anthropic", kind, attempts: 1, message: `Claude ${reason}` });

  if (!Array.isArray(message.content) || !message.usage) throw fail("bad_response", "sent an unexpected response shape");
  // Search turns that hit the server-side loop limit come back unfinished; the job layer retries them.
  if (message.stop_reason === "pause_turn") throw fail("server", "paused before finishing the answer");
  if (message.stop_reason === "refusal") throw fail("bad_response", "declined to answer");

  const searches = searchOutcomes(message.content);
  // Search errors come back inside a 200. With no successful search the answer is not grounded in
  // the local web, so it is not a valid check; max_uses_exceeded after good searches is fine.
  if (searches.errors.length > 0 && searches.succeeded === 0) {
    throw fail("search", `web search failed: ${searches.errors.join(", ")}`);
  }

  const answer = answerBlocks(message.content);
  const answerText = answer
    .map((block) => block.text)
    .join("")
    .trim();
  if (!answerText) throw fail("bad_response", "returned no answer text");

  const usage = message.usage;
  const cachedInputTokens = usage.cache_read_input_tokens ?? 0;
  const checkUsage = {
    // Anthropic reports cache reads and writes outside input_tokens; our usage counts them as input.
    inputTokens: usage.input_tokens + cachedInputTokens + (usage.cache_creation_input_tokens ?? 0),
    cachedInputTokens,
    outputTokens: usage.output_tokens,
    // Failed searches are not billed and not counted here.
    searchCalls: usage.server_tool_use?.web_search_requests ?? 0,
  };
  const model = CHECK_MODELS.anthropic;
  return {
    answerText,
    citations: citationsOf(answer),
    model: message.model,
    usage: checkUsage,
    costUsd: checkCostUsd(model, checkUsage),
    latencyMs,
  };
}

function searchOutcomes(content: Anthropic.ContentBlock[]) {
  let succeeded = 0;
  const errors: string[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    // Success is a list of results (empty when nothing matched); an error is a single object.
    if (Array.isArray(block.content)) succeeded++;
    else errors.push(block.content.error_code);
  }
  return { succeeded, errors };
}

// Text before the last search is narration ("I'll search for..."), not the answer.
function answerBlocks(content: Anthropic.ContentBlock[]): Anthropic.TextBlock[] {
  const lastTool = content.findLastIndex((b) => b.type === "server_tool_use" || b.type === "web_search_tool_result");
  return content.slice(lastTool + 1).filter((b): b is Anthropic.TextBlock => b.type === "text");
}

function citationsOf(answer: Anthropic.TextBlock[]): Citation[] {
  const byUrl = new Map<string, Citation>();
  for (const block of answer) {
    for (const cite of block.citations ?? []) {
      if (cite.type !== "web_search_result_location") continue;
      const url = cleanUrl(cite.url);
      if (url && !byUrl.has(url)) byUrl.set(url, { url, title: cite.title?.trim() || null });
    }
  }
  return [...byUrl.values()];
}
