// An AI answer made readable: web addresses become small source chips instead of long raw links, and the businesses
// it named become a numbered list with a short line each. Pure and import-free, for the browser.

import { answerBlocks } from "./answer-format";

export type Inline = { kind: "text"; text: string } | { kind: "source"; host: string; url: string };

// A web address, up to the first space; closing marks after it are not part of it.
const URL_RE = /https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/gi;

export function hostOfUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** Text cut around every web address in it, each address a source; "(…)" left empty by an address goes too. */
export function inlineParts(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (t: string) => {
    if (t) out.push({ kind: "text", text: t });
  };
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0];
    const host = hostOfUrl(url);
    if (!host) continue;
    push(text.slice(last, m.index));
    out.push({ kind: "source", host, url });
    last = m.index + url.length;
  }
  push(text.slice(last));
  // "see their site (" + chip + ")" reads as "see their site" + chip.
  return out
    .map((p, i) => {
      if (p.kind !== "text") return p;
      let t = p.text;
      if (out[i + 1]?.kind === "source") t = t.replace(/\s*[([]\s*$/, " ");
      if (out[i - 1]?.kind === "source") t = t.replace(/^\s*[)\]]/, "");
      return { ...p, text: t };
    })
    .filter((p) => p.kind === "source" || p.text.trim() !== "" || p.text === " ");
}

/** The words with every web address taken out, for a short line. */
export function withoutUrls(text: string): string {
  return inlineParts(text)
    .filter((p) => p.kind === "text")
    .map((p) => (p as { text: string }).text)
    .join("")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const SNIPPET_MAX = 160;

/** The first sentence, cut at a word near the limit. */
export function shortLine(text: string, max = SNIPPET_MAX): string {
  const clean = withoutUrls(text);
  const sentence = clean.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? clean;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}

export type NamedBusiness = { name: string; you: boolean; line: string };

const key = (s: string) => s.trim().toLowerCase();
const at = (text: string, name: string) => text.toLowerCase().indexOf(key(name));

/** What follows the name in a list item: "Bean House - great espresso" gives "great espresso". */
function lineAfter(item: string, name: string): string {
  const i = at(item, name);
  const rest = i === 0 ? item.slice(name.trim().length) : item;
  return shortLine(rest.replace(/^[\s*:,.\-|]+/, "").replace(/^\(([^)]*)\)\s*[-:]?\s*/, "$1. "));
}

/**
 * Every business the answer named, in the order it put them: list items first (the usual "1. Bean House - ..."),
 * then any named only in the text. `you` is marked so the page can highlight it.
 */
export function namedBusinesses(text: string, you: string | null, others: string[]): NamedBusiness[] {
  const names = [...new Set([you, ...others].filter((n): n is string => !!n && n.trim().length >= 3).map((n) => n.trim()))];
  const isYou = (n: string) => !!you && key(n) === key(you);
  const out: NamedBusiness[] = [];
  const taken = new Set<string>();
  const blocks = answerBlocks(text);

  for (const b of blocks) {
    if (b.kind !== "list") continue;
    for (const item of b.items) {
      const found = names
        .map((n) => ({ n, i: at(item, n) }))
        .filter((x) => x.i >= 0)
        .sort((a, z) => a.i - z.i || z.n.length - a.n.length)[0];
      if (!found || taken.has(key(found.n))) continue;
      taken.add(key(found.n));
      out.push({ name: found.n, you: isYou(found.n), line: lineAfter(item.slice(found.i), found.n) });
    }
  }

  const paragraphs = blocks.flatMap((b) => (b.kind === "list" ? b.items : [b.text]));
  const rest = names
    .filter((n) => !taken.has(key(n)) && at(text, n) >= 0)
    .sort((a, z) => at(text, a) - at(text, z));
  for (const n of rest) {
    const where = paragraphs.find((p) => at(p, n) >= 0) ?? "";
    const sentence = where.split(/(?<=[.!?])\s+/).find((s) => at(s, n) >= 0) ?? "";
    out.push({ name: n, you: isYou(n), line: shortLine(sentence) });
  }
  return out;
}
