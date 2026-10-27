// Saved AI answers, shaped for "why you are ahead or behind". Pure: rows come from dal.ts. Reads only what each scan
// already saved (visibility_results), so nothing here asks an AI or a website again.
import { z } from "zod";
import { hostOf } from "@/lib/site-type";

export type StandingCheck = {
  provider: string;
  questionId: string;
  /** The answer named the business. */
  youNamed: boolean;
  /** Tracked competitors the answer named, by their tracked name. */
  competitors: string[];
  /** The name extractor's list as saved (extracted_names), for businesses you don't track. Null when it failed. */
  extracted: unknown;
  /** Hosts of the sites the answer cited, each once. */
  sites: string[];
  /** The cited addresses themselves, each once, for which pages of a site AI used. */
  urls?: string[];
};

export type StandingRow = {
  provider: string;
  tracked_prompt_id: string | null;
  business_mentioned: boolean | null;
  competitors_mentioned: unknown;
  extracted_names: unknown;
  cited_sources: unknown;
};

// Saved as { name, position }; older rows may say `mentioned: false`, which means not named (scanning/check.ts).
const mentions = z.array(z.object({ name: z.string(), mentioned: z.boolean().optional() }));
const citations = z.array(z.object({ url: z.string() }));

export function toCheck(row: StandingRow): StandingCheck {
  const named = mentions.safeParse(row.competitors_mentioned);
  const cited = citations.safeParse(row.cited_sources);
  const sites = new Set<string>();
  const urls = new Set<string>();
  for (const c of cited.success ? cited.data : []) {
    const host = hostOf(c.url);
    if (!host) continue;
    sites.add(host);
    urls.add(c.url);
  }
  return {
    provider: row.provider,
    questionId: row.tracked_prompt_id ?? "none",
    youNamed: row.business_mentioned === true,
    competitors: named.success ? named.data.filter((m) => m.mentioned !== false).map((m) => m.name) : [],
    extracted: row.extracted_names,
    sites: [...sites],
    urls: [...urls],
  };
}

export const nameKey = (name: string) => name.trim().toLowerCase();

/** True when the answer named this tracked competitor. */
export function namedIn(check: StandingCheck, competitor: string): boolean {
  const want = nameKey(competitor);
  return check.competitors.some((n) => nameKey(n) === want);
}
