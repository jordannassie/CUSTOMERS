import "server-only";
// Claude reads the business's own pages and returns fixed fields (MVP_SPEC 3.2) with structured
// outputs. The API key is passed in; only a dal.ts reads secrets.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { INDUSTRIES } from "./industries";
import {
  AUTOFILL_MAX_TOKENS,
  AUTOFILL_MODEL,
  AUTOFILL_RETRY_MODEL,
  AUTOFILL_SYSTEM,
  autofillOutput,
  autofillUserMessage,
  type AutofillOutput,
  type SitePage,
} from "./prompts/business-autofill.v1";

export type AutofillModel = typeof AUTOFILL_MODEL | typeof AUTOFILL_RETRY_MODEL;

export type ExtractBusiness = (input: {
  domain: string;
  pages: SitePage[];
  model: AutofillModel;
}) => Promise<AutofillOutput>;

export type ExtractDeps = { fetch?: typeof fetch; timeoutMs?: number };

const TIMEOUT_MS = 30_000;

export class ExtractError extends Error {
  /** True when the model itself failed (refusal, cut off, bad JSON), false for API or network errors. */
  readonly modelFault: boolean;
  constructor(message: string, modelFault: boolean, cause?: unknown) {
    super(message, { cause });
    this.name = "ExtractError";
    this.modelFault = modelFault;
  }
}

export function extractRequest(input: Parameters<ExtractBusiness>[0]) {
  return {
    model: input.model,
    max_tokens: AUTOFILL_MAX_TOKENS,
    system: AUTOFILL_SYSTEM,
    messages: [{ role: "user" as const, content: autofillUserMessage(input.domain, input.pages) }],
    output_config: { format: zodOutputFormat(autofillOutput) },
  };
}

export function createBusinessExtractor(apiKey: string, deps: ExtractDeps = {}): ExtractBusiness {
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 1, timeout: deps.timeoutMs ?? TIMEOUT_MS });
  return async (input) => {
    let message: Anthropic.Message;
    try {
      message = await client.messages.create(extractRequest(input));
    } catch (err) {
      throw new ExtractError("Claude request failed", false, err);
    }
    return toOutput(message);
  };
}

export function toOutput(message: Anthropic.Message): AutofillOutput {
  if (message.stop_reason === "refusal") throw new ExtractError("Claude declined", true);
  if (message.stop_reason === "max_tokens") throw new ExtractError("Claude ran out of output tokens", true);
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return autofillOutput.parse(normalizeIndustry(JSON.parse(text)));
  } catch (err) {
    throw new ExtractError("Claude returned JSON that does not match the schema", true, err);
  }
}

// Structured outputs send the enum only as a hint, so "Coffee shop" can come back for coffee_shop.
// Anything still off the list becomes empty rather than a guess.
function normalizeIndustry(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || !("industry" in raw) || typeof raw.industry !== "string") return raw;
  const key = raw.industry.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return { ...raw, industry: (INDUSTRIES as readonly string[]).includes(key) ? key : "" };
}
