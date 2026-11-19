// The plain-text summary of one report (D-90): the weekly email's text part and the Reports page's "Copy email
// summary". Every number comes from the frozen snapshot, so it matches the PDF the link opens. Pure and free of
// server code, so the Reports page can build it in the browser with the share link it shows.
import type { ReportFix, ReportSnapshot } from "./snapshot-schema";

/** The fixes the summary lists. */
export const EMAIL_FIXES = 3;

/** The part of a snapshot the summary reads; small enough to hand to the browser. */
export type EmailSnapshot = Pick<ReportSnapshot, "business" | "period" | "score" | "named" | "rank"> & {
  fixes: Pick<ReportFix, "n" | "title" | "where">[];
};

/** The snapshot cut down to what reportEmailText reads. */
export function emailSnapshot(s: ReportSnapshot): EmailSnapshot {
  return {
    business: s.business,
    period: s.period,
    score: s.score,
    named: s.named,
    rank: s.rank,
    fixes: s.fixes.slice(0, EMAIL_FIXES).map((f) => ({ n: f.n, title: f.title, where: f.where })),
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function day(iso: string, withYear: boolean): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
}

/** "Sep 29 to Oct 28, 2026", with the first year only when the period crosses a new year. */
export function periodText(period: EmailSnapshot["period"]): string {
  const sameYear = period.start.slice(0, 4) === period.end.slice(0, 4);
  return `${day(period.start, !sameYear)} to ${day(period.end, true)}`;
}

const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

function rankLine(rank: EmailSnapshot["rank"]): string {
  if (!rank) return "Rank: none yet. AI did not name any of the tracked businesses.";
  const place = `Rank: #${rank.position} of ${rank.of} tracked businesses.`;
  if (rank.position === 1) return `${place} You lead the tracked businesses.`;
  return rank.leader ? `${place} Leader: ${rank.leader.name}, ${rank.leader.score}/100.` : place;
}

/**
 * "Visibility score: 15/100, 9 of 60 answers named Cheezious.", the rank, the top 3 fixes with where each is made,
 * and the link to the PDF. `link` null leaves the link line out.
 */
export function reportEmailText(snapshot: EmailSnapshot, link: string | null): string {
  const { business, score, named } = snapshot;
  const lines = [
    `${business.name}: AI visibility report, ${periodText(snapshot.period)}`,
    "",
    `Visibility score: ${score.value}/100, ${named.answers} of ${named.total} answers named ${business.name}.`,
  ];
  if (score.change) lines.push(`${score.change.direction === "up" ? "Up" : "Down"} ${points(score.change.points)} on the 30 days before.`);
  lines.push(rankLine(snapshot.rank));

  const fixes = snapshot.fixes.slice(0, EMAIL_FIXES);
  if (fixes.length > 0) {
    lines.push("", fixes.length === 1 ? "Top fix:" : `Top ${fixes.length} fixes:`);
    fixes.forEach((f, i) => lines.push(`${i + 1}. ${f.title} (where: ${f.where})`));
  }
  if (link) lines.push("", `Full report (PDF): ${link}`);
  return lines.join("\n");
}
