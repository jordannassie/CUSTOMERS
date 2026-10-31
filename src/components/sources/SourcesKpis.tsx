import { KpiStrip, KpiTile } from "@/components/app/KpiTile";
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
  const mentioning = p.topMentioning.hosts.length > 0 ? p.topMentioning.hosts.join(", ") : "None of them named you yet";
  const competitors = `Competitor sites: ${times(p.competitorSiteTimes)}. From all your questions.`;
  return (
    <KpiStrip testId="sources-kpis">
      <KpiTile label="Websites AI used" value={String(p.sitesUsed)} sub={`in ${p.answers} ${p.answers === 1 ? "answer" : "answers"}`} testId="kpi-sites" />
      <KpiTile
        label="Top source"
        value={<span title={p.topSource?.host}>{p.topSource?.host ?? "None yet"}</span>}
        sub={p.topSource ? `used in ${answersText(p.topSource.answers, p.answers)}` : "No website was linked yet"}
        testId="kpi-top-source"
      />
      <KpiTile
        label={`Top ${p.topMentioning.of} sources that mention you`}
        value={`${p.topMentioning.count} of ${p.topMentioning.of}`}
        sub={<span title={mentioning}>{mentioning}</span>}
        tone={p.topMentioning.count === 0 ? "mid" : undefined}
        testId="kpi-mention-you"
      />
      <KpiTile
        label="Your website used"
        value={p.ownSiteHost ? times(p.ownSiteAnswers) : "No website"}
        sub={<span title={competitors}>{competitors}</span>}
        tone={p.ownSiteHost && p.ownSiteAnswers === 0 ? "mid" : undefined}
        testId="kpi-own-site"
      />
    </KpiStrip>
  );
}
