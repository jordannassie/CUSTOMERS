// "What a customer actually heard": a short piece of a real saved answer around the name it shows, as the AI wrote
// it, minus markdown and citation marks. Pure; the dal reads answer_text only for the two answers it picks.

const MAX_CHARS = 260;
const SHORT_SENTENCE = 90;

/** Answer text as plain sentences: no markdown, links, citation numbers or list marks. */
export function plainAnswer(text: string): string {
  return text
    // A link in brackets is a citation: dropped. Any other link keeps its words.
    .replace(/\s*\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, "")
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1")
    .replace(/\[\^?\d+\]|【[^】]*】/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*(?:[-+\u2022]|\d+[.)])\s+/gm, "")
    // A line ending in a colon introduces a list: each line reads as its own sentence.
    .replace(/:[ \t]*\n/g, ".\n")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\s*[\u2013\u2014]\s*/g, ", ")
    .replace(/([.!?:;,])\s*\.(\s|$)/g, "$1$2")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function findName(text: string, names: string[]): { at: number; length: number } | null {
  const lower = text.toLowerCase();
  // The full name first, then its first word ("Cheezious" for "Cheezious Pizza"), as answers often shorten names.
  const tries = [...names, ...names.map((n) => n.split(/\s+/)[0]).filter((w) => w.length >= 4)];
  for (const name of tries) {
    const at = lower.indexOf(name.toLowerCase());
    if (at >= 0) return { at, length: name.length };
  }
  return null;
}

const sentenceStart = (text: string, at: number) => {
  const before = text.slice(0, at);
  const ends = [...before.matchAll(/[.!?]\s+/g)];
  const last = ends.at(-1);
  return last ? last.index! + last[0].length : 0;
};

const sentenceEnd = (text: string, from: number) => {
  const match = /[.!?](\s|$)/.exec(text.slice(from));
  return match ? from + match.index + 1 : text.length;
};

/** Cut on a word boundary, never mid word. */
function trimWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).replace(/[,;:]$/, "").trim();
}

/**
 * The sentence that names one of `names`, with the next one in the same paragraph when it is short; null when none
 * is named. Each line is read on its own, so a list item never runs into the next business on the list.
 */
export function excerptAround(raw: string, names: string[], max = MAX_CHARS): string | null {
  for (const line of raw.split(/\n+/)) {
    const text = plainAnswer(line);
    const found = findName(text, names);
    if (found) return around(text, found, max);
  }
  return null;
}

function around(text: string, found: { at: number; length: number }, max: number): string | null {
  let start = sentenceStart(text, found.at);
  let end = sentenceEnd(text, found.at + found.length);
  if (end - start < SHORT_SENTENCE && end < text.length) end = sentenceEnd(text, end + 1);
  // A very long sentence: start near the name so it stays in view.
  if (end - start > max && found.at - start > max / 3) {
    const from = text.lastIndexOf(" ", found.at - Math.floor(max / 4));
    start = from > start ? from + 1 : start;
  }
  return trimWords(text.slice(start, end).trim(), max) || null;
}
