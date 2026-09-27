import "server-only";
// Perplexity checks: Sonar through the Agent API with web search and the business location
// (MVP_SPEC 5.1, D-67). The Sonar Chat Completions endpoint and its web_search_options retired on
// 2026-09-27; user_location now sits on the web_search tool. The API key is passed in; only a dal.ts
// reads secrets.
import { z } from "zod";
import { CHECK_MODELS } from "./models";
import { checkCostUsd } from "./pricing";
import { ProviderError, postJson, type RequestDeps } from "./request";
import { cleanUrl } from "./urls";
import type { CheckInput, CheckResult, Citation, RunCheck } from "./types";

const AGENT_URL = "https://api.perplexity.ai/v1/agent";
const MAX_OUTPUT_TOKENS = 2_000;

const searchResultSchema = z.object({ id: z.number().optional(), url: z.string(), title: z.string().nullish() });
const annotationSchema = z.object({ type: z.string(), url: z.string().optional(), title: z.string().nullish() });
const outputItemSchema = z.object({
  type: z.string(),
  results: z.array(searchResultSchema).optional(),
  content: z
    .array(z.object({ type: z.string(), text: z.string().optional(), annotations: z.array(annotationSchema).nullish() }))
    .optional(),
});
const responseSchema = z.object({
  model: z.string(),
  status: z.string().optional(),
  error: z.object({ message: z.string() }).nullish(),
  output: z.array(outputItemSchema),
  usage: z.object({
    input_tokens: z.number(),
    input_tokens_details: z.object({ cache_read_input_tokens: z.number() }).partial().nullish(),
    output_tokens: z.number(),
    tool_calls_details: z.record(z.string(), z.object({ invocation: z.number() }).partial()).nullish(),
  }),
});
type AgentResponse = z.infer<typeof responseSchema>;
type SearchResult = z.infer<typeof searchResultSchema>;

export function createPerplexityCheck(apiKey: string, deps: RequestDeps = {}): RunCheck {
  return async (input: CheckInput): Promise<CheckResult> => {
    const model = CHECK_MODELS.perplexity;
    if (input.model !== model) throw new Error(`Perplexity adapter only runs ${model}, not ${input.model}`);

    const started = performance.now();
    const raw = await postJson("perplexity", AGENT_URL, { Authorization: `Bearer ${apiKey}` }, requestBody(input), deps);
    const latencyMs = Math.round(performance.now() - started);

    const fail = (kind: "server" | "bad_response", message: string) =>
      new ProviderError({ provider: "perplexity", kind, attempts: 1, message });
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) throw fail("bad_response", "Unexpected Perplexity response shape");
    const data = parsed.data;
    if (data.status === "failed") throw fail("server", `Perplexity response failed: ${data.error?.message ?? "no reason given"}`);
    if (data.status === "incomplete") throw fail("bad_response", "Perplexity stopped before finishing the answer");

    const answerText = answerTextOf(data);
    if (!answerText) throw fail("bad_response", "Perplexity returned no answer text");

    const usage = {
      inputTokens: data.usage.input_tokens,
      cachedInputTokens: data.usage.input_tokens_details?.cache_read_input_tokens ?? 0,
      outputTokens: data.usage.output_tokens,
      searchCalls: searchCallsOf(data),
    };
    return {
      answerText,
      citations: citationsOf(data, answerText),
      model: data.model,
      usage,
      costUsd: checkCostUsd(model, usage),
      latencyMs,
    };
  };
}

export function requestBody({ question, location, model }: CheckInput) {
  return {
    model,
    input: question,
    // A request that names a model (not a preset) only searches when the tool is listed.
    tools: [
      {
        type: "web_search",
        user_location: { country: location.country, region: location.region, city: location.city },
      },
    ],
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
  };
}

function messageParts(data: AgentResponse) {
  return data.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text");
}

function answerTextOf(data: AgentResponse): string {
  return messageParts(data)
    .map((part) => part.text ?? "")
    .join("\n\n")
    .trim();
}

function searchResults(data: AgentResponse): SearchResult[] {
  return data.output.filter((item) => item.type === "search_results").flatMap((item) => item.results ?? []);
}

// Usage reports invocations when it has them; otherwise each search_results item is one search.
function searchCallsOf(data: AgentResponse): number {
  const reported = data.usage.tool_calls_details?.search_web?.invocation;
  return reported ?? data.output.filter((item) => item.type === "search_results").length;
}

// Sources come from url_citation annotations and from [n] markers, which point at the search result
// whose id is n. When the answer has neither, every search result counts, as the old Sonar
// `citations` list did.
function citationsOf(data: AgentResponse, answerText: string): Citation[] {
  const results = searchResults(data);
  const byId = new Map(results.filter((r) => r.id !== undefined).map((r) => [r.id, r]));
  const cited: Array<{ url: string; title?: string | null }> = [];

  for (const part of messageParts(data)) {
    for (const note of part.annotations ?? []) {
      if (note.type === "url_citation" && note.url) cited.push({ url: note.url, title: note.title });
    }
  }
  for (const match of answerText.matchAll(/\[(\d+)\]/g)) {
    const result = byId.get(Number(match[1]));
    if (result) cited.push(result);
  }

  const byUrl = new Map<string, Citation>();
  for (const source of cited.length > 0 ? cited : results) {
    const url = cleanUrl(source.url);
    if (url && !byUrl.has(url)) byUrl.set(url, { url, title: source.title?.trim() || null });
  }
  return [...byUrl.values()];
}
