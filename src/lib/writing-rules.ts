// docs/design/WRITING.md as code, for text an AI model writes: the explanations (src/modules/insights) and the report
// fix wording (src/modules/reports/v2/wording). One copy, so both checks and their eval graders stay the same. Pure.

/** Words that read as AI-written or salesy. */
export const BANNED_WORDS = [
  "unlock", "unleash", "elevate", "empower", "seamless", "seamlessly", "robust", "leverage", "cutting-edge",
  "game-changer", "revolutionize", "supercharge", "delve", "harness", "streamline", "next-level", "effortless",
  "world-class", "landscape", "realm", "testament", "tapestry",
];

const LONG_DASH = /[–—]/;
const EMOJI = /\p{Extended_Pictographic}/u;

/** Long dashes, emoji and banned words; with `noExclamation`, any "!" too (report fixes). */
export function writingIssues(text: string, { noExclamation = false }: { noExclamation?: boolean } = {}): string[] {
  const issues: string[] = [];
  if (LONG_DASH.test(text)) issues.push("long dash");
  if (EMOJI.test(text)) issues.push("emoji");
  if (noExclamation && text.includes("!")) issues.push("exclamation mark");
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) if (new RegExp(`\\b${word}\\b`).test(lower)) issues.push(`banned word: ${word}`);
  return issues;
}

export type PromisePattern = [RegExp, string];

// Never promise results we cannot control. Only a guaranteed result counts: a business's own satisfaction guarantee
// or warranty is an honest thing to point out.
const PROMISES: PromisePattern[] = [
  [
    /\bguarantee(d|s|ing)?\s+(that\s+)?(you\s+)?((more|new)\s+(customers|clients|leads|calls|bookings|sales|business|traffic|visits|mentions|recommendations)|(the\s+)?results?|(a\s+)?(higher|better|top|first)\s+(rank|ranking|spot|place|position|placement)|(to\s+)?(rank|ranking|rankings|#1|number one)|(to\s+)?(be|get|appear|show up)\s+(recommended|named|mentioned|listed|first|on top))(?!\w)/i,
    "guarantee",
  ],
  [/\bresults?\s+(are\s+)?guaranteed\b/i, "guarantee"],
  [/\bwill rank\b/i, "will rank"],
  [/(^|\s)#1\b/, "#1"],
  [/\brank(s|ed)? first\b/i, "rank first"],
  [/\btop spot\b/i, "top spot"],
];

/** "This will make ChatGPT recommend you": checked on report fixes. */
export const AI_NAMING_PROMISE: PromisePattern = [
  /\bwill (make|get|have)\s+(AI|ChatGPT|Claude|Perplexity|assistants?)\b[^.]{0,40}\b(name|recommend|mention|pick|list)/i,
  "will make AI name you",
];

/** Each kind of promised result the text makes, once; `extra` patterns are checked after the shared ones. */
export function promiseIssues(text: string, extra: PromisePattern[] = []): string[] {
  const patterns = [...PROMISES, ...extra];
  return [...new Set(patterns.filter(([pattern]) => pattern.test(text)).map(([, word]) => `promises a result: ${word}`))];
}
