import "server-only";
// Claude reads the business's own pages and returns fixed fields (MVP_SPEC 3.2) with structured outputs; OpenAI
// answers the same prompt and schema when Claude fails (D-84). Clients are passed in; only a dal.ts reads secrets.
import { AiUnavailableError, runJob, type AiClients } from "@/modules/ai";
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
  /** Told which model actually answered: the Claude model asked for, or the ChatGPT backup (D-84). */
  answeredBy?: (model: string) => void;
}) => Promise<AutofillOutput>;

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
    task: input.model === AUTOFILL_MODEL ? "business_autofill" : "business_autofill_retry",
    model: input.model,
    maxTokens: AUTOFILL_MAX_TOKENS,
    system: AUTOFILL_SYSTEM,
    user: autofillUserMessage(input.domain, input.pages),
    schema: autofillOutput,
    timeoutMs: TIMEOUT_MS,
    prepare: normalizeIndustry,
  };
}

export function createBusinessExtractor(ai: AiClients): ExtractBusiness {
  return async (input) => {
    try {
      const result = await runJob(ai, extractRequest(input));
      input.answeredBy?.(result.model);
      return result.output;
    } catch (err) {
      // modelFault stays false when a provider failed, so the form can say auto-fill is unavailable.
      if (err instanceof AiUnavailableError) throw new ExtractError(err.message, err.modelFault, err);
      throw new ExtractError("Auto-fill request failed", false, err);
    }
  };
}

// Claude's structured outputs send the enum only as a hint, so "Coffee shop" can come back for coffee_shop.
// Anything still off the list becomes empty rather than a guess.
function normalizeIndustry(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || !("industry" in raw) || typeof raw.industry !== "string") return raw;
  const key = raw.industry.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return { ...raw, industry: (INDUSTRIES as readonly string[]).includes(key) ? key : "" };
}
