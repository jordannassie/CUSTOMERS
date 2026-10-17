import "server-only";
// Recorded answers for is_test agencies (D-61): full scans with no AI calls and no AI cost.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { normaliseText } from "./cache";
import { orderedNames, type ExtractNames } from "./extract";
import { EXTRACT_NAMES_VERSION } from "./prompts/extract-names.v1";
import { CHECK_MODELS } from "./providers/models";
import { ProviderError } from "./providers/request";
import { NO_SAMPLE_ANSWERS, noRecordedAnswers } from "./sample-answers";
import type { ProviderId, RunCheck } from "./providers/types";

export const RECORDED_ANSWERS_DIR = path.join(process.cwd(), "tests", "fixtures", "ai-answers");

const recordedAnswer = z.object({
  /** Hand-written placeholder until real answers are recorded (tests/fixtures/ai-answers/README.md). */
  synthetic: z.boolean().default(false),
  provider: z.enum(["openai", "anthropic", "perplexity"]),
  question: z.string().min(1),
  answerText: z.string().min(1),
  citations: z.array(z.object({ url: z.string(), title: z.string().nullable() })).default([]),
  /** Business names in the answer, labelled when recorded; absent means no extraction for it. */
  names: z.array(z.string()).optional(),
});

/** `industry` and `place` come from the file name ("synthetic-openai-coffee-austin-tx-1.json"), when it has them. */
export type RecordedAnswer = z.infer<typeof recordedAnswer> & { industry?: string; place?: string };

// "{synthetic|recorded}-{provider}-{industry}-{place}-{n}.json", as scripts/record-ai-answers.ts names them.
const FILE_NAME = /^(?:synthetic|recorded)-(?:openai|anthropic|perplexity)-([a-z]+)-([a-z0-9-]+?)-\d+\.json$/;

// The business industries the recordings cover, by the word in the file name.
const RECORDED_INDUSTRY: Record<string, string> = { coffee_shop: "coffee", dentist: "dentist", plumber: "plumber", restaurant: "restaurant" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type RecordedAnswers = {
  runCheck: (provider: ProviderId) => RunCheck;
  extractNames: ExtractNames;
};

export async function loadRecordedAnswers(dir = RECORDED_ANSWERS_DIR): Promise<RecordedAnswer[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const answers: RecordedAnswer[] = [];
  for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
    const [, industry, place] = FILE_NAME.exec(file) ?? [];
    answers.push({ ...recordedAnswer.parse(JSON.parse(await readFile(path.join(dir, file), "utf8"))), industry, place });
  }
  return answers;
}

/** Picks this model's answer whose question matches best: exact first, then the most shared words. */
/**
 * `kind`: the business's industry ("coffee_shop", "Bookstore"). Added to every question before matching, so a
 * question that names no trade ("Where's the best place to get cold brew?") still gets its own trade's answer.
 */
export function recordedAnswers(answers: RecordedAnswer[], kind?: string | null): RecordedAnswers {
  const hint = kind ? ` ${kind.replace(/_/g, " ")}` : "";
  const byProvider = new Map<ProviderId, RecordedAnswer[]>();
  for (const a of answers) byProvider.set(a.provider, [...(byProvider.get(a.provider) ?? []), a]);
  const namesByAnswer = new Map(answers.filter((a) => a.names).map((a) => [a.answerText, a.names!]));

  const runCheck =
    (provider: ProviderId): RunCheck =>
    async (input) => {
      const all = byProvider.get(provider) ?? [];
      if (all.length === 0) {
        throw new ProviderError({ provider, kind: "client", attempts: 1, message: noRecordedAnswers(provider) });
      }
      const pool = narrowed(all, kind, input.location.city);
      if (pool.length === 0) throw new ProviderError({ provider, kind: "client", attempts: 1, message: NO_SAMPLE_ANSWERS });
      const answer = closestAnswer(pool, `${input.question}${hint}`);
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


const placeMatches = (place: string | undefined, city: string) => !!place && (place === slug(city) || place.startsWith(`${slug(city)}-`));

/**
 * Only answers recorded for the same industry and the same city (BUG-072, 2026-10-14): a test plumber in Islamabad
 * never gets Austin plumbers, and a test restaurant gets no plumbers at all. With none, the check fails with
 * NO_SAMPLE_ANSWERS instead of showing another city's or trade's answers. A business with no industry (only ever
 * made by automated tests) keeps the closest answer of all.
 */
export function narrowed(pool: RecordedAnswer[], kind: string | null | undefined, city: string | null | undefined): RecordedAnswer[] {
  if (!kind) return pool;
  // "coffee_shop" as stored, or "Coffee shop" as some seeds write it.
  const industry = RECORDED_INDUSTRY[kind.trim().toLowerCase().replace(/[\s-]+/g, "_")];
  if (!industry || !city) return [];
  return pool.filter((a) => a.industry === industry && placeMatches(a.place, city));
}

/**
 * The recorded answer whose question is closest. Words count by how rare they are across the recorded questions, so
 * the trade ("coffee", "plumber") decides, not the city or "which ... in" that every question shares (BUG-072: a
 * test coffee shop got plumbers and dentists in Also recommended).
 */
export function closestAnswer(pool: RecordedAnswer[], question: string): RecordedAnswer {
  const wanted = normaliseText(question);
  const exact = pool.find((a) => normaliseText(a.question) === wanted);
  if (exact) return exact;
  const asked = wordsOf(wanted);
  const recorded = pool.map((a) => wordsOf(normaliseText(a.question)));
  const weight = rarity(recorded);
  let best = pool[stableIndex(wanted, pool.length)];
  let bestScore = 0;
  pool.forEach((a, i) => {
    const score = similarity(asked, recorded[i], weight);
    if (score > bestScore) [best, bestScore] = [a, score];
  });
  return best;
}

// One word for one trade across the recorded questions: "cafe" asks what "coffee shop" answers.
const SAME_WORD: Record<string, string> = {
  cafe: "coffee",
  cafes: "coffee",
  coffeehouse: "coffee",
  espresso: "coffee",
  latte: "coffee",
  brew: "coffee",
  cappuccino: "coffee",
  plumbers: "plumber",
  plumbing: "plumber",
  dentists: "dentist",
  dental: "dentist",
};

// Words every customer question uses; with a dozen recorded questions their rarity alone does not push them down.
const QUESTION_WORDS = new Set(
  "a an the what which who where how is are can could i me my we to in near of for from with and or best top good get find open".split(" "),
);

function wordsOf(text: string): Set<string> {
  return new Set(
    text
      .split(" ")
      .filter((w) => w && !QUESTION_WORDS.has(w))
      .map((w) => SAME_WORD[w] ?? w),
  );
}

/** log(1 + N / df): a word in every question weighs little, one in a single industry's questions weighs a lot. */
function rarity(questions: Set<string>[]): (word: string) => number {
  const df = new Map<string, number>();
  for (const q of questions) for (const w of q) df.set(w, (df.get(w) ?? 0) + 1);
  const n = questions.length;
  return (word) => Math.log(1 + n / (df.get(word) ?? 0.5));
}

function similarity(a: Set<string>, b: Set<string>, weight: (word: string) => number): number {
  let shared = 0;
  let all = 0;
  for (const w of new Set([...a, ...b])) {
    const x = weight(w);
    all += x;
    if (a.has(w) && b.has(w)) shared += x;
  }
  return all === 0 ? 0 : shared / all;
}

function stableIndex(text: string, size: number): number {
  return createHash("sha256").update(text).digest().readUInt32BE(0) % size;
}
