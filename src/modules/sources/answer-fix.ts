// "Add to Actions" from one AI answer on the Questions page ("Why you were skipped"): the same fix Sources and
// Compare save for a site (same titles, steps and key, so the site is never added twice). Pure.
import { subKind } from "./classify";
import { canGetListed, fixFor, siteKey, titleFor, type SiteAction } from "./listings";

const isGoogle = (host: string) => /(^|\.)google\.[a-z.]+$/.test(host);

/**
 * The fix for the first site in `hosts` a business can get listed on (Google, review, delivery, guide, social or
 * directory sites): never your own site or a competitor's. Null when the answer used none of those.
 */
export function answerSiteFix(
  hosts: string[],
  ctx: { ownDomain: string | null; place: string | null; label: string; question: string; named: string[] },
): SiteAction | null {
  for (const host of hosts) {
    const kind = subKind(host, ctx.ownDomain);
    if (!isGoogle(host) && !canGetListed({ kind })) continue;
    const named = ctx.named.length > 0 ? ` and named ${ctx.named.slice(0, 3).join(", ")}, not you` : ", and did not name you";
    return {
      title: titleFor({ host, kind }),
      fact: `${ctx.label} used ${host} for "${ctx.question}"${named}.`,
      whatToDo: fixFor({ host, kind }, ctx.place),
      whereToApply: isGoogle(host) ? "Google Business Profile" : host,
      impact: "medium",
      category: kind === "reviews" ? "reviews_reputation" : "citations",
      source: "sources",
      dedupeKey: siteKey(host),
      evidenceData: { domain: host, answers: 1 },
    };
  }
  return null;
}
