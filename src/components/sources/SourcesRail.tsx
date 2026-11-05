import { RailCard, RailNotice, StatRows } from "@/components/checkin/Rail";
import { answersText, type Site } from "@/modules/sources/service";
import { groupTotals, plural } from "./status";

type Props = {
  answers: number;
  sitesUsed: number;
  sites: Site[];
  topSource: { host: string; answers: number } | null;
  topMentioning: { count: number; of: number; hosts: string[] };
  ownSite: { host: string | null; answers: number };
  competitorSiteTimes: number;
  toolLabel: string | null;
};

const times = (n: number) => plural(n, "time");
const SUB = "block text-xs font-normal text-muted-foreground";

// Check-in right rail (C-Sources): "By the numbers" and a quick win. The KPI test ids and wording of the old KPI strip
// live on here, so nothing it showed is lost.
export function SourcesRail(p: Props) {
  const totals = groupTotals(p.sites);
  const mentioning = p.topMentioning.hosts.length > 0 ? p.topMentioning.hosts.join(", ") : "None of them named you yet";
  // The most used site whose answers named you sometimes or always: the cheapest place to build on.
  const win = [...p.sites].filter((s) => s.mentions === "sometimes" || s.mentions === "always").sort((a, b) => b.answers - a.answers)[0];
  const winTools = win ? win.models.length : 0;

  return (
    <>
      <RailCard title="By the numbers" testId="sources-kpis">
        <StatRows
          rows={[
            {
              label: "Websites used",
              value: (
                <>
                  {p.sitesUsed} <span className="font-normal text-muted-foreground">in {plural(p.answers, "answer")}</span>
                </>
              ),
              testId: "kpi-sites",
            },
            {
              label: "Top source",
              value: p.topSource ? (
                <>
                  <span className="block break-all">{p.topSource.host}</span>
                  <span className={SUB}>used in {answersText(p.topSource.answers, p.answers)}</span>
                </>
              ) : (
                <>
                  None yet<span className={SUB}>No website was linked yet</span>
                </>
              ),
              testId: "kpi-top-source",
            },
            { label: "Mention you", value: totals.mentions.sites },
            { label: "Skip you", value: totals.skips.sites, tone: totals.skips.sites > 0 ? "danger" : undefined },
            { label: "Rivals' own sites", value: totals.rival.sites },
            {
              label: `Top ${p.topMentioning.of} that name you`,
              value: <span title={mentioning}>{`${p.topMentioning.count} of ${p.topMentioning.of}`}</span>,
              testId: "kpi-mention-you",
            },
            {
              label: "Your site cited",
              value: (
                <>
                  <span className={p.ownSite.host && p.ownSite.answers === 0 ? "text-danger" : undefined}>
                    {p.ownSite.host ? times(p.ownSite.answers) : "No website"}
                  </span>
                  <span className={SUB}>Competitor sites: {times(p.competitorSiteTimes)}. From all your questions.</span>
                </>
              ),
              testId: "kpi-own-site",
            },
          ]}
        />
      </RailCard>
      {win && (
        <RailNotice title="Quick win" tint="soft" testId="sources-quick-win">
          {win.host} was used in {answersText(win.answers, p.answers)}
          {p.toolLabel ? ` by ${p.toolLabel}` : winTools > 1 ? ` by ${winTools} AI tools` : ""}, and answers that used it named you. Keeping your listing there
          complete is the quickest place to build on.
        </RailNotice>
      )}
    </>
  );
}
