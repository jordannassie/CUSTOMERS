// What kind of site an AI answer cited, so a fix never asks the owner to "check your listing" on another
// plumber's own website (BUG-100). Pure.
import { sourceType } from "@/lib/site-type";

/** listing: review sites and directories where a business can have a listing. business_site: another business's own website. */
export type SiteKind = "listing" | "news" | "business_site";

export function siteKind(domain: string): SiteKind {
  const type = sourceType(domain, null);
  if (type === "reviews" || type === "directories") return "listing";
  return type === "news" ? "news" : "business_site";
}

const compact = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

/** The business whose own website this is, when its name matches the domain: abacusplumbing.com is Abacus Plumbing's. */
export function siteOwner(domain: string, names: string[]): string | null {
  const label = compact(domain.split(".").slice(0, -1).join(""));
  if (label.length < 4) return null;
  for (const name of names) {
    // "Abacus Plumbing, Air Conditioning & Electrical" starts with abacusplumbing.
    const want = compact(name);
    if (want.length < 4) continue;
    if (label === want || (label.length >= 6 && (want.startsWith(label) || label.startsWith(want)))) return name;
  }
  return null;
}

export type CitedSite = {
  domain: string;
  /** Only a "listing" site can hold the owner's listing; a "business_site" is another business's own website (BUG-100). */
  kind: SiteKind;
  /** Whose website it is, when the domain matches a competitor or a business AI named. */
  owner: string | null;
  answers: number;
  answersWithoutYou: number;
};

/** Sites cited across the answers, without the business's own, most cited first. */
export function citedSites(citedSets: Set<string>[], namedYou: boolean[], ownDomain: string | null, names: string[]): CitedSite[] {
  const sites = new Map<string, { answers: number; answersWithoutYou: number }>();
  citedSets.forEach((set, i) => {
    for (const d of set) {
      if (d === ownDomain) continue;
      const s = sites.get(d) ?? { answers: 0, answersWithoutYou: 0 };
      s.answers += 1;
      if (!namedYou[i]) s.answersWithoutYou += 1;
      sites.set(d, s);
    }
  });
  return [...sites]
    .sort((a, b) => b[1].answers - a[1].answers || a[0].localeCompare(b[0]))
    .map(([domain, s]) => {
      const kind = siteKind(domain);
      return { domain, kind, owner: kind === "business_site" ? siteOwner(domain, names) : null, ...s };
    });
}
