// How an AI answer is laid out in "See the answers": paragraphs and lists instead of one block of text, with the
// business names marked so the owner sees at a glance who was recommended. Pure and import-free, for the browser.

export type Block = { kind: "p"; text: string } | { kind: "list"; ordered: boolean; items: string[] };

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/** Paragraphs split on blank lines; a run of "1." or "-" lines becomes a list. */
export function answerBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let para: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    const flushPara = () => {
      if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    };
    const flushList = () => {
      if (list) blocks.push({ kind: "list", ...list });
      list = null;
    };
    for (const line of lines) {
      if (BULLET.test(line)) {
        flushPara();
        list ??= { ordered: NUMBERED.test(line), items: [] };
        list.items.push(line.replace(BULLET, ""));
      } else if (list && list.items.length > 0 && /^[a-z(]/.test(line)) {
        // A wrapped list line carries on the item above.
        list.items[list.items.length - 1] += ` ${line}`;
      } else {
        flushList();
        para.push(line);
      }
    }
    flushPara();
    flushList();
  }
  return blocks;
}

export type Part = { text: string; mark: "you" | "other" | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text cut around every name it contains, longest names first, each marked as you or another business. */
export function markNames(text: string, you: string | null, others: string[]): Part[] {
  const names = [...new Set([you, ...others].filter((n): n is string => !!n && n.trim().length >= 3).map((n) => n.trim()))].sort(
    (a, b) => b.length - a.length,
  );
  if (names.length === 0) return [{ text, mark: null }];
  const pattern = new RegExp(`(${names.map(escape).join("|")})`, "gi");
  const youKey = you?.trim().toLowerCase();
  return text
    .split(pattern)
    .filter((t) => t !== "")
    .map((t) => {
      const hit = names.find((n) => n.toLowerCase() === t.toLowerCase());
      return { text: t, mark: hit ? (hit.toLowerCase() === youKey ? "you" : "other") : null };
    });
}
