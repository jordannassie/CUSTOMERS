// The one model that grades AI output (MVP_SPEC 25). Every suite reads the model from here so it is
// pinned in one place. The client is injected, so suites test their grading with a fake judge.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const JUDGE_MODEL = "claude-haiku-4-5";
const JUDGE_MAX_TOKENS = 2_000;
const TIMEOUT_MS = 60_000;

// Principle 5: a model never grades its own output.
export function assertNotSelfGrading(modelUnderTest: string, judgeModel: string = JUDGE_MODEL): void {
  if (modelUnderTest === judgeModel) {
    throw new Error(`${judgeModel} cannot grade its own output; pick a different judge model.`);
  }
}

export type JudgeRequest<T> = { system: string; user: string; schema: z.ZodType<T> };
export type Judge = <T>(req: JudgeRequest<T>) => Promise<T>;

/** A failure of the grading call itself, counted apart from model results (principle 9). */
export class JudgeApiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "JudgeApiError";
  }
}

export function createJudge(apiKey: string, deps: { fetch?: typeof fetch } = {}): Judge {
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 2, timeout: TIMEOUT_MS });
  return async (req) => {
    let message: Anthropic.Message;
    try {
      message = await client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: JUDGE_MAX_TOKENS,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        output_config: { format: zodOutputFormat(req.schema) },
      });
    } catch (err) {
      throw new JudgeApiError("judge request failed", err);
    }
    if (message.stop_reason !== "end_turn") throw new JudgeApiError(`judge stopped with ${message.stop_reason}`);
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return req.schema.parse(JSON.parse(text));
  };
}
