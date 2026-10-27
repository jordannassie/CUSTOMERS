// "Why you were skipped" under an answer that left the business out. Facts from the answer only: the sites it used
// and who it named. Never a guessed reason. Pure and import-free, for the browser and the server.

export type SkippedAnswer = { label: string; sites: { host: string }[]; competitors: string[]; others: string[] };

/** "yelp.com", "yelp.com and bbb.org", "yelp.com, bbb.org and 2 others". */
export function listText(items: string[], max = 3): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length <= max) return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
  const rest = items.length - (max - 1);
  return `${items.slice(0, max - 1).join(", ")} and ${rest} others`;
}

export function whySkipped(a: SkippedAnswer): string {
  const sites = listText(a.sites.map((s) => s.host));
  const names = listText([...a.competitors, ...a.others]);
  if (sites && names) return `${a.label} used ${sites} here and named ${names}, not you.`;
  if (names) return `${a.label} named ${names}, not you. It did not show which websites it used.`;
  if (sites) return `${a.label} used ${sites} here and did not name any business.`;
  return `${a.label} did not name any business in this answer.`;
}

export type FixText = { id: string; title: string; text: string };
export type MatchedFix = { id: string; title: string; host: string };

/** "tripadvisor.com" to "tripadvisor", "yelp.co.uk" to "yelp", "maps.google.com" to "google". */
export function siteBrand(host: string): string {
  const labels = host.toLowerCase().split(".");
  if (labels.length < 2) return host;
  const shortSuffix = labels.length >= 3 && labels.at(-2)!.length <= 3 && labels.at(-1)!.length === 2;
  return shortSuffix ? labels.at(-3)! : labels.at(-2)!;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The first saved fix that names one of these sites (by address, or by name when that is 4 letters or more). */
export function fixForSites(fixes: FixText[], hosts: string[]): MatchedFix | null {
  for (const host of hosts) {
    const brand = siteBrand(host);
    const words = [host, ...(brand.length >= 4 ? [brand] : [])].map(escape);
    const pattern = new RegExp(`(^|[^a-z0-9])(${words.join("|")})([^a-z0-9]|$)`, "i");
    const fix = fixes.find((f) => pattern.test(`${f.title}\n${f.text}`));
    if (fix) return { id: fix.id, title: fix.title, host };
  }
  return null;
}
