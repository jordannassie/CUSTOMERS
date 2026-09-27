import "server-only";
// "Also recommended by AI" (MVP_SPEC 5.2, D-74): Claude Haiku lists every business an answer names.
// The list is stored with the shared cached answer, so a cache hit reuses it for free; matching it
// to one business and its competitors is done per business in extract-match.ts.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { classify } from "./providers/anthropic";
import { checkCostUsd } from "./providers/pricing";
import { ProviderError, TIMEOUT_MS, withRetries, type Attempt, type RequestDeps } from "./providers/request";
import type { CheckUsage } from "./providers/types";
import { coreName } from "./mention-text";
import {
  EXTRACT_MAX_TOKENS,
  EXTRACT_MODEL,
  EXTRACT_NAMES_SYSTEM,
  EXTRACT_NAMES_VERSION,
  extractNamesOutput,
  extractNamesUserMessage,
  type ExtractNamesOutput,
} from "./prompts/extract-names.v1";

export type ExtractedName = {
  name: string;
  /** 1-based order of first appearance among the names in the answer. Stored, never shown as a rank (D-63). */
  position: number;
};

export type Extraction = {
  promptVersion: string;
  model: string;
  names: ExtractedName[];
  usage: CheckUsage;
  costUsd: number;
};

export type ExtractNames = (answer: string) => Promise<Extraction>;

export function extractionRequest(answer: string) {
  return {
    model: EXTRACT_MODEL,
    max_tokens: EXTRACT_MAX_TOKENS,
    system: EXTRACT_NAMES_SYSTEM,
    messages: [{ role: "user" as const, content: extractNamesUserMessage(answer) }],
    output_config: { format: zodOutputFormat(extractNamesOutput) },
  };
}

export function createNameExtractor(apiKey: string, deps: RequestDeps = {}): ExtractNames {
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  // Retries run through withRetries so every Anthropic call shares one policy (REL-01).
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 0, timeout: timeoutMs });

  return async (answer) => {
    const message = await withRetries(async (attempt): Promise<Attempt<Anthropic.Message>> => {
      try {
        return { ok: true, value: await client.messages.create(extractionRequest(answer)) };
      } catch (err) {
        return classify(err, attempt, timeoutMs);
      }
    }, deps);
    return toExtraction(message, { batch: false });
  };
}

/** Turns one Messages API response (live or from a batch) into an Extraction. */
export function toExtraction(message: Anthropic.Message, opts: { batch: boolean }): Extraction {
  const fail = (reason: string) =>
    new ProviderError({ provider: "anthropic", kind: "bad_response", attempts: 1, message: `Name extraction ${reason}` });

  if (message.stop_reason === "refusal") throw fail("was declined");
  // A cut-off JSON list would silently drop names, so it is an error rather than a short list.
  if (message.stop_reason === "max_tokens") throw fail("ran out of output tokens");

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let output: ExtractNamesOutput;
  try {
    output = extractNamesOutput.parse(JSON.parse(text));
  } catch (err) {
    throw new ProviderError({
      provider: "anthropic",
      kind: "bad_response",
      attempts: 1,
      cause: err,
      message: "Name extraction returned JSON that does not match the schema",
    });
  }

  const usage: CheckUsage = {
    inputTokens:
      message.usage.input_tokens +
      (message.usage.cache_read_input_tokens ?? 0) +
      (message.usage.cache_creation_input_tokens ?? 0),
    cachedInputTokens: message.usage.cache_read_input_tokens ?? 0,
    outputTokens: message.usage.output_tokens,
    searchCalls: 0,
  };
  const fullPrice = checkCostUsd(EXTRACT_MODEL, usage);
  return {
    promptVersion: EXTRACT_NAMES_VERSION,
    model: message.model,
    names: orderedNames(output.businesses.map((b) => b.name)),
    usage,
    // The Message Batches API bills half price (D-74).
    costUsd: opts.batch ? Math.round(fullPrice * 500_000) / 1_000_000 : fullPrice,
  };
}

/** Trims, drops empty names and repeats of the same business, and numbers them in order. */
export function orderedNames(raw: string[]): ExtractedName[] {
  const seen = new Set<string>();
  const names: ExtractedName[] = [];
  for (const name of raw.map((n) => n.trim()).filter(Boolean)) {
    const key = coreName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push({ name, position: names.length + 1 });
  }
  return names;
}

// What goes in ai_answer_cache.extracted_names.
const storedExtraction = z.object({
  promptVersion: z.string(),
  model: z.string(),
  names: z.array(z.object({ name: z.string(), position: z.number().int().positive() })),
});

export type StoredExtraction = z.infer<typeof storedExtraction>;

export function toStoredExtraction(extraction: Extraction): StoredExtraction {
  return { promptVersion: extraction.promptVersion, model: extraction.model, names: extraction.names };
}

/** Null when nothing was stored yet or it came from an older prompt version, so it is extracted again. */
export function readStoredExtraction(value: unknown): StoredExtraction | null {
  const parsed = storedExtraction.safeParse(value);
  if (!parsed.success || parsed.data.promptVersion !== EXTRACT_NAMES_VERSION) return null;
  return parsed.data;
}
