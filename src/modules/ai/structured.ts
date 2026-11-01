// One structured-output call for a background AI job: Claude first, OpenAI as the backup (D-84). Both get the
// same prompt text and the job's own zod schema, and both answers are parsed by that schema, so callers get
// the same typed output whichever model answered. Clients are injected; the API keys never reach this file.
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import {
  AiUnavailableError,
  classifyAiError,
  createBreaker,
  describeFailure,
  ModelFault,
  shouldFallBack,
  type AiFailure,
  type AiProvider,
  type Breaker,
} from "./errors";
import { aiCostUsd, type AiUsage } from "./pricing";

/** The breaker every job shares in this server instance. */
export const sharedBreaker = createBreaker();

export type AiSuccess = {
  task: string;
  provider: AiProvider;
  model: string;
  usage: AiUsage;
  costUsd: number;
  fellBack: boolean;
  primaryError: string | null;
};

/** Hooks for logging; each one is awaited but can never fail the job. */
export type AiReporter = {
  /** Every failed attempt, with whether the backup is taking over. */
  failure?: (task: string, failure: AiFailure, fellBack: boolean) => Promise<void> | void;
  success?: (result: AiSuccess) => Promise<void> | void;
  /** Claude marked unavailable by any server instance (a scan or another job); null when it is not. */
  claudeOutage?: () => Promise<AiFailure | null>;
};

export type RunStructuredInput<S extends z.ZodType> = {
  /** Names the job in logs, usage and the OpenAI schema name: letters, digits, _ and - only. */
  task: string;
  system: string;
  user: string;
  schema: S;
  maxTokens: number;
  timeoutMs: number;
  primary: { anthropic: Anthropic | null; model: string };
  /** Null when the backup is turned off (AI_FALLBACK_ENABLED=false) or has no key. */
  backup: { openai: OpenAI | null; model: string } | null;
  /** Runs on the raw JSON before the schema check, for lenient fixes such as mapping "Coffee shop" to coffee_shop. */
  prepare?: (raw: unknown) => unknown;
  breaker?: Breaker;
  report?: AiReporter;
  now?: () => number;
};

export type RunStructuredResult<S extends z.ZodType> = AiSuccess & { output: z.output<S> };

type Attempt = { output: unknown; model: string; usage: AiUsage };

export async function runStructured<S extends z.ZodType>(input: RunStructuredInput<S>): Promise<RunStructuredResult<S>> {
  const breaker = input.breaker ?? sharedBreaker;
  const now = input.now ?? Date.now;
  const backup = input.backup?.openai ? input.backup : null;
  let primaryFailure: AiFailure | null = null;

  let skipped = breaker.isOpen("anthropic", now());
  // A rejected key or an empty account seen elsewhere skips Claude here too, instead of failing once per instance.
  if (!skipped.open && backup && input.report?.claudeOutage) {
    const shared = await input.report.claudeOutage().catch(() => null);
    if (shared) {
      breaker.trip(shared, now());
      skipped = { open: true, reason: shared };
    }
  }
  if (skipped.open && backup) {
    primaryFailure = { ...skipped.reason, message: `skipped while Claude is down (${skipped.reason.kind})` };
  } else if (!input.primary.anthropic) {
    primaryFailure = { provider: "anthropic", model: input.primary.model, kind: "not_configured", status: null, message: "ANTHROPIC_API_KEY is not set" };
  } else {
    try {
      const attempt = await withOneModelRetry(() => callAnthropic(input.primary.anthropic!, input.primary.model, input));
      return await succeed(input, "anthropic", attempt, false, null);
    } catch (err) {
      primaryFailure = classifyAiError("anthropic", input.primary.model, err);
      breaker.trip(primaryFailure, now());
    }
  }

  const fallBack = backup !== null && shouldFallBack(primaryFailure.kind);
  // A skipped call is not a new failure, so it is not logged again.
  if (!primaryFailure.message.startsWith("skipped")) await safely(() => input.report?.failure?.(input.task, primaryFailure, fallBack));
  if (!fallBack) throw new AiUnavailableError(primaryFailure, null);

  try {
    const attempt = await withOneModelRetry(() => callOpenAI(backup.openai!, backup.model, input));
    return await succeed(input, "openai", attempt, true, describeFailure(primaryFailure));
  } catch (err) {
    const backupFailure = classifyAiError("openai", backup.model, err);
    await safely(() => input.report?.failure?.(input.task, backupFailure, false));
    throw new AiUnavailableError(primaryFailure, backupFailure);
  }
}

async function succeed<S extends z.ZodType>(
  input: RunStructuredInput<S>,
  provider: AiProvider,
  attempt: Attempt,
  fellBack: boolean,
  primaryError: string | null,
): Promise<RunStructuredResult<S>> {
  const result: AiSuccess = {
    task: input.task,
    provider,
    model: attempt.model,
    usage: attempt.usage,
    costUsd: aiCostUsd(attempt.model, attempt.usage),
    fellBack,
    primaryError,
  };
  await safely(() => input.report?.success?.(result));
  return { ...result, output: attempt.output as z.output<S> };
}

// A cut-off or malformed answer often comes back fine on a second try; a refusal does not.
async function withOneModelRetry(call: () => Promise<Attempt>): Promise<Attempt> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ModelFault && err.reason !== "refused") return call();
    throw err;
  }
}

function parse<S extends z.ZodType>(input: RunStructuredInput<S>, text: string): unknown {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new ModelFault("bad_json", "returned text that is not JSON", err);
  }
  const parsed = input.schema.safeParse(input.prepare ? input.prepare(raw) : raw);
  if (!parsed.success) throw new ModelFault("bad_json", "returned JSON that does not match the schema", parsed.error);
  return parsed.data;
}

async function callAnthropic<S extends z.ZodType>(client: Anthropic, model: string, input: RunStructuredInput<S>): Promise<Attempt> {
  const message = await client.messages.create(
    {
      model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
      output_config: { format: zodOutputFormat(input.schema) },
    },
    { timeout: input.timeoutMs },
  );
  if (message.stop_reason === "refusal") throw new ModelFault("refused", "declined");
  if (message.stop_reason === "max_tokens") throw new ModelFault("cut_off", "ran out of output tokens");
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const cacheRead = message.usage.cache_read_input_tokens ?? 0;
  return {
    output: parse(input, text),
    model: message.model,
    usage: {
      inputTokens: message.usage.input_tokens + cacheRead + (message.usage.cache_creation_input_tokens ?? 0),
      cachedInputTokens: cacheRead,
      outputTokens: message.usage.output_tokens,
    },
  };
}

async function callOpenAI<S extends z.ZodType>(client: OpenAI, model: string, input: RunStructuredInput<S>): Promise<Attempt> {
  const response = await client.responses.create(
    {
      model,
      instructions: input.system,
      input: input.user,
      max_output_tokens: input.maxTokens,
      store: false,
      text: { format: zodTextFormat(input.schema, input.task) },
    },
    { timeout: input.timeoutMs },
  );
  const parts = response.output.flatMap((item) => (item.type === "message" ? item.content : []));
  if (parts.some((p) => p.type === "refusal")) throw new ModelFault("refused", "declined");
  if (response.status === "incomplete") {
    throw new ModelFault("cut_off", `stopped early (${response.incomplete_details?.reason ?? "incomplete"})`);
  }
  const text = parts.map((p) => (p.type === "output_text" ? p.text : "")).join("");
  return {
    output: parse(input, text),
    model: response.model,
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    },
  };
}

async function safely(run: () => Promise<void> | void | undefined): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error(`AI report hook failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
