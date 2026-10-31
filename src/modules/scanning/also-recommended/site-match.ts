// A website for a business AI named but you don't track (mockup-ui: its icon in "Also recommended by AI"). Only a site
// the same answers cited, and only when its address spells the business's name, so a row never shows another
// business's icon. Pure.
import { z } from "zod";
import { coreName } from "../mention-text";

const cited = z.array(z.object({ url: z.string() }).passthrough());

/** The hosts of the sites an answer cited ("www.Barton-Bean.com/menu" gives "barton-bean.com"). */
export function citedHosts(value: unknown): string[] {
  const parsed = cited.safeParse(value);
  if (!parsed.success) return [];
  const hosts: string[] = [];
  for (const { url } of parsed.data) {
    try {
      hosts.push(new URL(url).hostname.toLowerCase().replace(/^www\./, ""));
    } catch {
      // Not a full address: nothing to show an icon for.
    }
  }
  return hosts;
}

const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The cited host whose first label is the business's name with the spaces taken out: "Lone Star Brew Bar" and
 * "lonestarbrewbar.com", or "Barton Bean Coffee" and "bartonbean.com" (the name starts with the site's label). Labels
 * under 5 letters never match, so "joe.com" is not taken for "Joe's Pizza Palace". Null when none fits.
 */
export function siteForName(name: string, hosts: Iterable<string>): string | null {
  const want = compact(coreName(name));
  if (want.length < 5) return null;
  for (const host of hosts) {
    const label = compact(host.split(".")[0] ?? "");
    if (label.length < 5) continue;
    if (label === want || want.startsWith(label) || (label.startsWith(want) && label.length - want.length <= 8)) return host;
  }
  return null;
}
