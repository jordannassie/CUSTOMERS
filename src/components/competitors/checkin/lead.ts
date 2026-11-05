import { TABLE_MODELS, type TableRow } from "@/modules/competitors";

// The Competitors check-in's sentences, built only from the numbers the page already has. Pure.

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
export const countWord = (n: number) => WORDS[n] ?? String(n);

/** First and latest value of a row's last scans (the spark lines share one set of scans). */
export const ends = (r: TableRow) => ({ from: r.spark[0] ?? null, to: r.spark.at(-1) ?? null });

/** "Three businesses are named more often than you. Domino's Pizza gained the most since Oct 26." */
export function slopeLead(rows: TableRow[], fromLabel: string | null): string | null {
  const you = rows.find((r) => r.isYou);
  if (!you || you.score === null) return null;
  const ahead = rows.filter((r) => !r.isYou && r.score !== null && r.score > (you.score as number)).length;
  const first =
    ahead === 0
      ? "No business you track is named more often than you."
      : `${countWord(ahead)} ${ahead === 1 ? "business is" : "businesses are"} named more often than you.`;
  if (!fromLabel) return first;
  const gains = rows
    .map((r) => ({ r, ...ends(r) }))
    .filter((g) => g.from !== null && g.to !== null)
    .map((g) => ({ name: g.r.isYou ? null : g.r.name, gain: (g.to as number) - (g.from as number) }))
    .sort((a, b) => b.gain - a.gain);
  const top = gains[0];
  if (!top || top.gain <= 0) return first;
  return `${first} ${top.name === null ? "You" : top.name} gained the most since ${fromLabel}.`;
}

/** The AI tools this business uses, in the usual order. */
export const toolsUsed = (rows: TableRow[]) => TABLE_MODELS.filter((m) => rows.some((r) => m.id in r.byModel));

/** "ChatGPT and Claude lean most on Pizza Hut; Perplexity leans most on Slice Theory. You do best on Claude, at 37% of its answers." */
export function favouritesText(rows: TableRow[]): string {
  const tools = toolsUsed(rows);
  const parts = tools
    .map((t) => {
      const top = [...rows].sort((a, b) => (b.byModel[t.id] ?? -1) - (a.byModel[t.id] ?? -1))[0];
      const v = top?.byModel[t.id] ?? 0;
      return v > 0 ? { tool: t.label, name: top.isYou ? "you" : top.name } : null;
    })
    .filter((p): p is { tool: string; name: string } => p !== null);
  // Tools that lean on the same business are named together: "ChatGPT and Claude lean most on Pizza Hut".
  const groups = [...new Set(parts.map((p) => p.name))].map((name) => ({ name, tools: parts.filter((p) => p.name === name).map((p) => p.tool) }));
  const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0]);
  const leans = groups.length
    ? `${groups.map((g) => `${and(g.tools)} ${g.tools.length > 1 ? "lean" : "leans"} most on ${g.name}`).join("; ")}.`
    : "";
  const you = rows.find((r) => r.isYou);
  const best = you ? tools.map((t) => ({ t, v: you.byModel[t.id] ?? 0 })).sort((a, b) => b.v - a.v)[0] : undefined;
  const yours = best && best.v > 0 ? ` You do best on ${best.t.label}, at ${best.v}% of its answers.` : " None of them named you in the last 30 days.";
  return `${leans}${yours}`.trim();
}
