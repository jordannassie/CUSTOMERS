import { RankedBars } from "@/components/charts/RankedBars";
import { StackedShareBar } from "@/components/charts/StackedShareBar";
import type { Site } from "@/modules/sources/service";
import { GROUPS, GROUP_ORDER, groupOf, groupTotals, plural, shortHost, toolMarks } from "./status";

const RANKED = 10;

type Props = { sites: Site[]; moreSites: number };

// The first Check-in card's charts (C-Sources): every use of a listed website as one 100% bar, coloured by what the
// site does for you, then the most used sites with how many answers used each and which AI tools did.
export function SourceMix({ sites, moreSites }: Props) {
  const sorted = [...sites].sort((a, b) => b.answers - a.answers);
  const totals = groupTotals(sorted);
  const present = GROUP_ORDER.filter((g) => totals[g].sites > 0);
  const top = sorted.slice(0, RANKED);
  const summary = sorted
    .slice(0, 12)
    .map((s) => `${s.host} ${s.answers}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-4">
      <StackedShareBar
        caption={moreSites > 0 ? `Every time one of the ${sorted.length} most used websites was used, as one bar` : "Every time a website was used, as one bar"}
        ariaLabel={`Uses of each website, coloured by whether it mentions you. ${summary}.`}
        segments={sorted.map((s) => {
          const g = GROUPS[groupOf(s.mentions)];
          return { key: s.host, label: shortHost(s.host), value: s.answers, color: g.color, dark: g.dark };
        })}
        legend={present.map((g) => ({ label: GROUPS[g].legend, color: GROUPS[g].color }))}
      />
      <div data-testid="top-sites">
        <RankedBars
          ariaLabel={`The ${plural(top.length, "website")} AI used most, by answers that used each.`}
          headers={{ label: "Website", value: "Answers that used it", tools: "Used by" }}
          rows={top.map((s) => ({
            key: s.host,
            label: (
              <span className="truncate" title={s.host}>
                {s.host}
              </span>
            ),
            sub: s.kindLabel,
            value: s.answers,
            color: GROUPS[groupOf(s.mentions)].color,
            tools: toolMarks(s.models),
          }))}
          footnote="G ChatGPT, C Claude, P Perplexity. Filled means that tool used the site."
        />
      </div>
    </div>
  );
}
