import { Donut } from "@/components/charts/Donut";
import type { Site } from "@/modules/sources/service";
import { OwnSiteStatus } from "./OwnSiteStatus";
import { GROUPS, GROUP_ORDER, groupTotals, plural } from "./status";

type Props = { sites: Site[]; answers: number; moreSites: number; ownSite: { host: string | null; answers: number }; toolLabel: string | null };

const LEAD = "font-serif text-[20px] leading-[1.35] font-normal sm:text-[22px]";

// The second Check-in card (C-Sources): uses split by what each site does for you, with your own site's count in
// the hole, and one plain sentence about your site and the rivals' sites. Every number is from the listed sites.
export function SourceDonut({ sites, answers, moreSites, ownSite, toolLabel }: Props) {
  const who = toolLabel ?? "AI";
  const totals = groupTotals(sites);
  const uses = GROUP_ORDER.reduce((n, g) => n + totals[g].uses, 0);
  const own = ownSite.answers;
  const rivals = sites.filter((s) => s.mentions === "competitor").sort((a, b) => b.answers - a.answers);
  const rivalUses = totals.rival.uses;
  const present = GROUP_ORDER.filter((g) => totals[g].uses > 0);

  const lead = !ownSite.host
    ? "We don't have your website yet."
    : own === 0
      ? "Your own website was never used."
      : `${who} used your own website in ${own} of ${plural(answers, "answer")}.`;
  // Counts come from the listed sites; past the first 50, the rest are left out and the sentence says so.
  const site = moreSites > 0 ? "one of these websites" : "a website";
  const ownLine = ownSite.host
    ? `Out of ${plural(uses, "time")} ${who} used ${site}, ${totals.own.uses === 0 ? "none were" : `${totals.own.uses} ${totals.own.uses === 1 ? "was" : "were"}`} ${ownSite.host}.`
    : `${who} used ${site} ${plural(uses, "time")}.`;
  const names = rivals.slice(0, 3).map((s) => s.host);
  const rivalLine =
    rivals.length === 0
      ? ""
      : rivals.length === 1
        ? ` ${names[0]}, a rival's own site, was used ${plural(rivalUses, "time")}.`
        : ` Rival sites ${names.join(", ")}${rivals.length > 3 ? " and others" : ""} were used ${plural(rivalUses, "time")} between them.`;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <Donut
        className="mx-auto sm:mx-0"
        segments={present.map((g) => ({ label: GROUPS[g].donut, value: totals[g].uses, color: GROUPS[g].color }))}
        center={
          ownSite.host
            ? { value: String(own), caption: `from ${ownSite.host}`, tone: own === 0 ? "danger" : "ink" }
            : { value: String(uses), caption: "website uses" }
        }
        ariaLabel={`Donut of ${uses} website uses: ${present.map((g) => `${totals[g].uses} on ${GROUPS[g].donut.toLowerCase()}`).join(", ")}.${ownSite.host ? ` ${own} from ${ownSite.host}.` : ""}`}
      />
      <div className="flex min-w-[240px] flex-[1_1_280px] flex-col gap-3">
        <h2 className={LEAD}>{lead}</h2>
        <p className="text-[15px] leading-relaxed text-ink-2">
          {ownLine}
          {rivalLine}
        </p>
        <OwnSiteStatus host={ownSite.host} cited={own} toolLabel={toolLabel} />
        <dl className="flex flex-col text-sm">
          {present.map((g) => (
            <div key={g} className="flex items-center justify-between gap-3 border-t border-track py-2">
              <dt className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: GROUPS[g].color }} aria-hidden="true" />
                {GROUPS[g].donut}
              </dt>
              <dd className="font-semibold tabular-nums">{totals[g].uses}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
