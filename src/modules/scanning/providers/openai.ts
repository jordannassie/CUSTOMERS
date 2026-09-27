import "server-only";
// ChatGPT checks through the OpenAI Responses API with web search and the business location
// (MVP_SPEC 5.1, D-67, D-68). The API key is passed in; only a dal.ts reads secrets.
import { z } from "zod";
import { CHECK_MODELS } from "./models";
import { checkCostUsd } from "./pricing";
import { ProviderError, postJson, type RequestDeps } from "./request";
import { cleanUrl } from "./urls";
import type { CheckInput, CheckResult, Citation, RunCheck } from "./types";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_OUTPUT_TOKENS = 2_000;

const annotationSchema = z.object({ type: z.string(), url: z.string().optional(), title: z.string().optional() });
const outputItemSchema = z.object({
  type: z.string(),
  action: z.object({ type: z.string() }).partial().optional(),
  content: z
    .array(z.object({ type: z.string(), text: z.string().optional(), annotations: z.array(annotationSchema).optional() }))
    .optional(),
});
const responseSchema = z.object({
  model: z.string(),
  status: z.string().optional(),
  error: z.object({ message: z.string() }).nullish(),
  output: z.array(outputItemSchema),
  usage: z.object({
    input_tokens: z.number(),
    input_tokens_details: z.object({ cached_tokens: z.number() }).partial().optional(),
    output_tokens: z.number(),
  }),
});
type OpenAIResponse = z.infer<typeof responseSchema>;

export function createOpenAICheck(apiKey: string, deps: RequestDeps = {}): RunCheck {
  return async (input: CheckInput): Promise<CheckResult> => {
    const model = CHECK_MODELS.openai;
    if (input.model !== model) throw new Error(`OpenAI adapter only runs ${model}, not ${input.model}`);

    const started = performance.now();
    const raw = await postJson("openai", RESPONSES_URL, { Authorization: `Bearer ${apiKey}` }, requestBody(input), deps);
    const latencyMs = Math.round(performance.now() - started);

    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ProviderError({ provider: "openai", kind: "bad_response", attempts: 1, message: "Unexpected OpenAI response shape" });
    }
    const data = parsed.data;
    if (data.status === "failed") {
      const message = `OpenAI response failed: ${data.error?.message ?? "no reason given"}`;
      throw new ProviderError({ provider: "openai", kind: "server", attempts: 1, message });
    }

    const answerText = answerTextOf(data);
    if (!answerText) {
      throw new ProviderError({ provider: "openai", kind: "bad_response", attempts: 1, message: "OpenAI returned no answer text" });
    }

    const usage = {
      inputTokens: data.usage.input_tokens,
      cachedInputTokens: data.usage.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: data.usage.output_tokens,
      searchCalls: searchCallsOf(data),
    };
    return { answerText, citations: citationsOf(data), model: data.model, usage, costUsd: checkCostUsd(model, usage), latencyMs };
  };
}

export function requestBody({ question, location, model }: CheckInput) {
  return {
    model,
    input: question,
    tools: [
      {
        type: "web_search",
        user_location: { type: "approximate", city: location.city, region: location.region, country: location.country },
      },
    ],
    max_output_tokens: MAX_OUTPUT_TOKENS,
    // Answers are saved on our side; OpenAI does not need to keep them.
    store: false,
  };
}

function messageParts(data: OpenAIResponse) {
  return data.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text");
}

function answerTextOf(data: OpenAIResponse): string {
  return messageParts(data)
    .map((part) => part.text ?? "")
    .join("\n\n")
    .trim();
}

// Only "search" actions are billed per call; opening or finding in a page is part of the same search.
function searchCallsOf(data: OpenAIResponse): number {
  return data.output.filter((item) => item.type === "web_search_call" && (item.action?.type ?? "search") === "search")
    .length;
}

function citationsOf(data: OpenAIResponse): Citation[] {
  const byUrl = new Map<string, Citation>();
  for (const part of messageParts(data)) {
    for (const note of part.annotations ?? []) {
      if (note.type !== "url_citation" || !note.url) continue;
      const url = cleanUrl(note.url);
      if (url && !byUrl.has(url)) byUrl.set(url, { url, title: note.title?.trim() || null });
    }
  }
  return [...byUrl.values()];
}
