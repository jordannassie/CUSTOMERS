// Small, hand-counted inputs for the version 2 report tests. 30 answers over 5 questions (6 each): Cheezious is named
// in 6 (score 20), Pizza Hut in 14 (47), Domino's in 5 (17), Dampukh in none.
import type { LeaderRow } from "@/modules/competitors";
import type { StandingCheck } from "@/modules/standing";
import type { BuildInput } from "./build";

export const NOW = new Date("2026-10-28T10:00:00Z");

export const check = (questionId: string, youNamed: boolean, competitors: string[] = [], sites: string[] = [], provider = "openai"): StandingCheck => ({
  provider,
  questionId,
  youNamed,
  competitors,
  extracted: null,
  sites,
});

export const row = (name: string, score: number | null, extra: Partial<LeaderRow> = {}): LeaderRow => ({
  name,
  isYou: false,
  score,
  standing: null,
  collecting: false,
  change: null,
  shade: null,
  ...extra,
});

export const QUESTIONS = new Map([
  ["q-price", "Cheap pizza deals in Rawalpindi"],
  ["q-quality", "Best pizza in Rawalpindi"],
  ["q-speed", "Fastest pizza delivery in Rawalpindi"],
  ["q-near", "Pizza place near me in Saddar"],
  ["q-trust", "Most reliable pizza place with good reviews"],
]);

const PH = "Pizza Hut";
const DOM = "Domino's";
const providers = ["openai", "anthropic", "perplexity"];
const times = (n: number, make: (i: number) => StandingCheck) => Array.from({ length: n }, (_, i) => make(i));

/** 6 answers per question, the counts in each comment. */
export function sampleChecks(): StandingCheck[] {
  const p = (i: number) => providers[i % 3];
  return [
    // Price: you in 4, Pizza Hut in 1. thecookbook.pk in 3 (you in 3), foodpanda.pk in 2 (you in 1).
    ...times(6, (i) => check("q-price", i < 4, i === 5 ? [PH] : [], [...(i < 3 ? ["thecookbook.pk"] : []), ...(i === 3 || i === 4 ? ["foodpanda.pk"] : [])], p(i))),
    // Quality: you in 0, Pizza Hut in 4, Domino's in 3. tripadvisor.com in 4, google.com in 3.
    ...times(6, (i) => check("q-quality", false, [...(i < 4 ? [PH] : []), ...(i >= 3 ? [DOM] : [])], [...(i < 4 ? ["tripadvisor.com"] : []), ...(i < 3 ? ["www.google.com"] : [])], p(i))),
    // Speed: you in 0, Pizza Hut in 4. foodpanda.pk in 5, maps.google.com in 2.
    ...times(6, (i) => check("q-speed", false, i < 4 ? [PH] : [], [...(i < 5 ? ["foodpanda.pk"] : []), ...(i < 2 ? ["maps.google.com"] : [])], p(i))),
    // Near me: you in 1, Pizza Hut in 3, Domino's in 2. google.com in 3 (you in 0), pizzahut.com.pk in 2, tiktok.com in 2.
    ...times(6, (i) => check("q-near", i === 5, [...(i < 3 ? [PH] : []), ...(i === 3 || i === 4 ? [DOM] : [])], [...(i < 3 ? ["google.com"] : []), ...(i < 2 ? ["pizzahut.com.pk"] : []), ...(i === 3 || i === 4 ? ["tiktok.com"] : [])], p(i))),
    // Trust: you in 1, Pizza Hut in 2. tripadvisor.com in 2 (you in 1).
    ...times(6, (i) => check("q-trust", i === 0, i === 1 || i === 2 ? [PH] : [], i < 2 ? ["tripadvisor.com"] : [], p(i))),
  ];
}

export function sampleLeaderboard(): LeaderRow[] {
  return [row(PH, 47), row("Cheezious", 20, { isYou: true }), row(DOM, 17), row("Dampukh", 0)];
}

export function sampleInput(overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    now: NOW,
    days: 30,
    agency: { name: "Brightline Digital", logoPath: null, accent: "#1F4FD1", contactEmail: null, bookingUrl: null },
    business: { name: "Cheezious", domain: "cheezious.com", market: "Rawalpindi, Punjab" },
    engines: ["ChatGPT", "Claude", "Perplexity"],
    score: { value: 20, margin: 6, change: { direction: "up", points: 2 } },
    checks: sampleChecks(),
    questions: QUESTIONS,
    leaderboard: sampleLeaderboard(),
    competitorDomains: new Map([["Pizza Hut", "pizzahut.com.pk"]]),
    excerpts: { named: null, competitor: null },
    nextScanAt: "2026-11-27T09:00:00.000Z",
    ...overrides,
  };
}

/** Every string in a value, for wording checks. */
export function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** Every key in a value, for "no Google Places values" checks. */
export function keys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keys);
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => [k, ...keys(v)]);
  return [];
}

export const LONG_DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
export const BANNED = /\b(unlock|unleash|elevate|empower|seamless(ly)?|robust|leverage|cutting-edge|game-changer|revolutionize|supercharge|delve|tapestry|harness|streamline|next-level|effortless|world-class)\b/i;
