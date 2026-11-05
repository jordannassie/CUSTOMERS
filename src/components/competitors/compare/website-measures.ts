// The four website measures (B-93), shared by the Website tab's radar (WebsiteScore) and the Check-in website card.
// Each side counted the same way from the one read of each site (D-85). Pure.
import { CLAIMS } from "@/lib/site-claims";
import type { WhyPanel } from "@/modules/competitors";

type Website = WhyPanel["website"];
/** One side of one measure: the count as written, and its place on the 0 to 100 shape. */
export type Side = { label: string; score: number } | null;
export type Measure = { key: string; axis: string; title: string; them: Side; you: Side };

const share = (n: number, of: number) => (of > 0 ? Math.round((100 * n) / of) : 0);

/** The four measures of a website, each side counted the same way from the one read of each site (D-85). */
export function measures(website: Website): Measure[] {
  const checks = (website.compare ?? []).filter((r) => typeof r.them === "boolean");
  const words = (website.compare ?? []).find((r) => typeof r.them === "number");
  const passed = (side: "them" | "you"): Side => {
    if (checks.length === 0 || checks.some((r) => r[side] === null)) return null;
    const n = checks.filter((r) => r[side] === true).length;
    return { label: `${n} of ${checks.length}`, score: share(n, checks.length) };
  };
  const theirClaims = website.claims.filter((r) => !!r.them).length;
  const yourClaims = website.claims.some((r) => r.you === null) ? null : website.claims.filter((r) => !!r.you).length;
  const w = { them: typeof words?.them === "number" ? words.them : null, you: typeof words?.you === "number" ? words.you : null };
  const most = Math.max(1, w.them ?? 0, w.you ?? 0);
  const total = website.services.length;
  const covered = website.services.some((s) => s.yours === null) ? null : website.services.filter((s) => !!s.yours).length;
  return [
    { key: "found", axis: "AI can read", title: "What AI tools can find", them: passed("them"), you: passed("you") },
    {
      key: "topics",
      axis: "Topics",
      title: "Things customers ask about",
      them: { label: `${theirClaims} of ${CLAIMS.length}`, score: share(theirClaims, CLAIMS.length) },
      you: yourClaims === null ? null : { label: `${yourClaims} of ${CLAIMS.length}`, score: share(yourClaims, CLAIMS.length) },
    },
    {
      key: "words",
      axis: "Detail",
      title: "Words on the pages we read",
      them: w.them === null ? null : { label: w.them.toLocaleString("en-US"), score: share(w.them, most) },
      you: w.you === null ? null : { label: w.you.toLocaleString("en-US"), score: share(w.you, most) },
    },
    {
      key: "services",
      axis: "Services",
      title: "Their services you list too",
      them: total > 0 ? { label: `${total} of ${total}`, score: 100 } : null,
      you: covered === null || total === 0 ? null : { label: `${covered} of ${total}`, score: share(covered, total) },
    },
  ];
}
