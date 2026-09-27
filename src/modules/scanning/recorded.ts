import "server-only";
// Recorded answers for is_test agencies (D-61): full scans with no AI calls and no AI cost.
// B-31 fills tests/fixtures/ai-answers/; until then a test scan finds no answers and charges nothing.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { normaliseText } from "./cache";
import { orderedNames, type ExtractNames } from "./extract";
import { EXTRACT_NAMES_VERSION } from "./prompts/extract-names.v1";
import { CHECK_MODELS } from "./providers/models";
import { ProviderError } from "./providers/request";
import type { ProviderId, RunCheck } from "./providers/types";

export const RECORDED_ANSWERS_DIR = path.join(process.cwd(), "tests", "fixtures", "ai-answers");

const recordedAnswer = z.object({
  provider: z.enum(["openai", "anthropic", "perplexity"]),
  question: z.string().min(1),
  answerText: z.string().min(1),
  citations: z.array(z.object({ url: z.string(), title: z.string().nullable() })).default([]),
  /** Business names in the answer, labelled when recorded; absent means no extraction for it. */
  names: z.array(z.string()).optional(),
});

export type RecordedAnswer = z.infer<typeof recordedAnswer>;

export type RecordedAnswers = {
  runCheck: (provider: ProviderId) => RunCheck;
  extractNames: ExtractNames;
};

export async function loadRecordedAnswers(dir = RECORDED_ANSWERS_DIR): Promise<RecordedAnswer[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const answers: RecordedAnswer[] = [];
  for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
    answers.push(recordedAnswer.parse(JSON.parse(await readFile(path.join(dir, file), "utf8"))));
  }
  return answers;
}

/** Picks the answer recorded for this question and model, else a fixed one of that model's answers. */
export function recordedAnswers(answers: RecordedAnswer[]): RecordedAnswers {
  const byProvider = new Map<ProviderId, RecordedAnswer[]>();
  for (const a of answers) byProvider.set(a.provider, [...(byProvider.get(a.provider) ?? []), a]);
  const namesByAnswer = new Map(answers.filter((a) => a.names).map((a) => [a.answerText, a.names!]));

  const runCheck =
    (provider: ProviderId): RunCheck =>
    async (input) => {
      const pool = byProvider.get(provider) ?? [];
      if (pool.length === 0) {
        throw new ProviderError({ provider, kind: "client", attempts: 1, message: `No recorded ${provider} answers` });
      }
      const wanted = normaliseText(input.question);
      const answer = pool.find((a) => normaliseText(a.question) === wanted) ?? pool[stableIndex(wanted, pool.length)];
      return {
        answerText: answer.answerText,
        citations: answer.citations,
        model: CHECK_MODELS[provider],
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, searchCalls: 0 },
        costUsd: 0,
        latencyMs: 0,
      };
    };

  const extractNames: ExtractNames = async (answerText) => {
    const names = namesByAnswer.get(answerText);
    if (!names) throw new Error("No recorded names for this answer");
    return {
      promptVersion: EXTRACT_NAMES_VERSION,
      model: "recorded",
      names: orderedNames(names),
      usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, searchCalls: 0 },
      costUsd: 0,
    };
  };

  return { runCheck, extractNames };
}

function stableIndex(text: string, size: number): number {
  return createHash("sha256").update(text).digest().readUInt32BE(0) % size;
}
