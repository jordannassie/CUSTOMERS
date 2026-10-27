import { answersText } from "@/modules/sources/service";

type Props = {
  answers: number;
  sitesUsed: number;
  topSource: { host: string; answers: number } | null;
  topMentioning: { count: number; of: number; hosts: string[] };
  ownSiteHost: string | null;
  ownSiteAnswers: number;
  competitorSiteTimes: number;
};

const times = (n: number) => `${n} ${n === 1 ? "time" : "times"}`;

/** Four numbers first: how many sites AI used, the one it used most, which top sites name you, and your own site. */
export function SourcesKpis(p: Props) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="sources-kpis">
      <Tile label="Websites AI used" value={String(p.sitesUsed)} detail={`in ${p.answers} ${p.answers === 1 ? "answer" : "answers"}`} testId="kpi-sites" />
      <Tile
        label="Top source"
        value={p.topSource?.host ?? "None yet"}
        detail={p.topSource ? `used in ${answersText(p.topSource.answers, p.answers)}` : "No website was linked yet"}
        testId="kpi-top-source"
        truncate
      />
      <Tile
        label={`Top ${p.topMentioning.of} sources that mention you`}
        value={`${p.topMentioning.count} of ${p.topMentioning.of}`}
        detail={p.topMentioning.hosts.length > 0 ? p.topMentioning.hosts.join(", ") : "None of them named you yet"}
        testId="kpi-mention-you"
      />
      <Tile
        label="Your website used"
        value={p.ownSiteHost ? times(p.ownSiteAnswers) : "No website"}
        detail={`Competitor sites: ${times(p.competitorSiteTimes)}`}
        testId="kpi-own-site"
      />
    </dl>
  );
}

function Tile({ label, value, detail, testId, truncate }: { label: string; value: string; detail: string; testId: string; truncate?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-surface p-5" data-testid={testId}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-semibold tracking-[-0.02em] tabular-nums ${truncate ? "truncate" : ""}`} title={truncate ? value : undefined}>
        {value}
      </dd>
      <dd className="line-clamp-2 text-[13px] text-text-hint">{detail}</dd>
    </div>
  );
}
