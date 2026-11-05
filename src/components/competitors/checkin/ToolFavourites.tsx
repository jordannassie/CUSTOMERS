import { AiMessage, Explain } from "@/components/checkin";
import { CHART, DotMatrix } from "@/components/charts";
import type { TableRow } from "@/modules/competitors";
import { favouritesText, toolsUsed } from "./lead";

// ChatGPT's grey is too light for white text, so its dots use the darker grey; Perplexity's orange takes dark text.
const COLUMN: Record<string, { color: string; dark?: boolean }> = {
  openai: { color: CHART.chatgptStrong },
  anthropic: { color: CHART.claude },
  perplexity: { color: CHART.perplexity, dark: true },
};

// C-Competitors: business by AI tool, each tool's 30-day share of answers that named the business (TableRow.byModel).
export function ToolFavourites({ rows, index }: { rows: TableRow[]; index: number }) {
  const tools = toolsUsed(rows);
  const shown = rows.filter((r) => !r.collecting || r.isYou);
  if (tools.length === 0 || shown.length === 0) return null;
  const summary = shown
    .map((r) => `${r.isYou ? `${r.name} (you)` : r.name}: ${tools.map((t) => `${t.label} ${r.byModel[t.id] ?? "no checks"}`).join(", ")}`)
    .join(". ");
  return (
    <AiMessage lead={tools.length > 1 ? "Each AI app has its own favourites." : `What ${tools[0].label} picks.`} index={index}>
      <Explain>{favouritesText(shown)}</Explain>
      <div data-testid="model-comparison-chart">
        <DotMatrix
          ariaLabel={`Share of each AI tool's answers that named each business, last 30 days. ${summary}.`}
          columns={tools.map((t) => ({ label: t.label, ...COLUMN[t.id] }))}
          rows={shown.map((r) => ({
            key: `${r.isYou}-${r.name}`,
            label: r.isYou ? `${r.name} (you)` : r.name,
            emphasis: r.isYou,
            values: tools.map((t) => r.byModel[t.id] ?? null),
          }))}
        />
      </div>
      <p className="text-xs text-muted-foreground">Last 30 days. The bigger the circle, the more of that AI&apos;s answers named the business.</p>
    </AiMessage>
  );
}
