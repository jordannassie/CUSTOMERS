// Check-in Sources: what each website does for you, as the colour groups the mix bar, donut and ranked bars share.
// Pure, from the rows the page already loaded.
import { CHART } from "@/components/charts/chart-kit";
import type { ToolMark } from "@/components/charts/RankedBars";
import type { ProviderId } from "@/modules/scanning";
import type { MentionsYou, Site } from "@/modules/sources/service";

export type SourceGroup = "mentions" | "skips" | "rival" | "own";

export const GROUP_ORDER: SourceGroup[] = ["mentions", "skips", "rival", "own"];

/** Colour, the mix bar's legend, the donut's legend; dark text where white would fail 4.5:1. */
export const GROUPS: Record<SourceGroup, { color: string; dark: boolean; legend: string; donut: string }> = {
  mentions: { color: CHART.you, dark: false, legend: "Mentions you", donut: "Sites that mention you" },
  skips: { color: CHART.rival, dark: true, legend: "Skips you", donut: "Sites that skip you" },
  rival: { color: CHART.grey2, dark: true, legend: "A rival's own site", donut: "Rivals' own sites" },
  own: { color: "var(--cd-primary-ink)", dark: false, legend: "Your own site", donut: "Your own site" },
};

export function groupOf(mentions: MentionsYou): SourceGroup {
  if (mentions === "own") return "own";
  if (mentions === "competitor") return "rival";
  if (mentions === "no") return "skips";
  return "mentions";
}

/** Uses per group (one per site per answer) and how many sites fall in each. */
export function groupTotals(sites: Site[]): Record<SourceGroup, { uses: number; sites: number }> {
  const out = Object.fromEntries(GROUP_ORDER.map((g) => [g, { uses: 0, sites: 0 }])) as Record<SourceGroup, { uses: number; sites: number }>;
  for (const s of sites) {
    const g = out[groupOf(s.mentions)];
    g.uses += s.answers;
    g.sites += 1;
  }
  return out;
}

const MARKS: { provider: ProviderId; short: string; name: string; color: string; dark: boolean }[] = [
  { provider: "openai", short: "G", name: "ChatGPT", color: CHART.chatgptStrong, dark: false },
  { provider: "anthropic", short: "C", name: "Claude", color: CHART.claude, dark: false },
  { provider: "perplexity", short: "P", name: "Perplexity", color: CHART.perplexity, dark: true },
];

/** The G, C and P badges for one site: filled when that AI tool used it. */
export function toolMarks(models: ProviderId[]): ToolMark[] {
  return MARKS.map((m) => ({ short: m.short, name: m.name, used: models.includes(m.provider), color: m.color, dark: m.dark }));
}

/** "half of them", "every one of them" or "12 of them", for the lead sentence. */
export function shareOfThem(part: number, total: number): string {
  if (total > 0 && part === total) return "every one of them";
  const pct = total > 0 ? (part / total) * 100 : 0;
  if (pct >= 48 && pct <= 52) return "half of them";
  return `${part} of them`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "foodpanda" from "foodpanda.pk", for labels inside the mix bar. */
export const shortHost = (host: string) => host.replace(/^www\./, "").split(".")[0] ?? host;
