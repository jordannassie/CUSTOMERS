// "Check their website" (B-91): what is saved about a competitor's website. Pure. A site is read once and kept: no
// screen offers a second read, and the database row doubles as the claim that stops two clicks reading it twice.
import { z } from "zod";
import { hostOf } from "@/lib/site-type";

/** A claim this old was left by a check that never finished (a crash or a timeout), so it may be taken over. */
export const READING_STALE_MS = 10 * 60 * 1000;

/** The claim row a check writes before reading, so a second click sees "being checked" instead of reading again. */
export const READING = { reading: true } as const;

const signals = z.object({
  businessSchema: z.boolean(),
  contactForm: z.boolean(),
  reviews: z.boolean(),
  faq: z.boolean(),
  hours: z.boolean(),
  words: z.number(),
  aiBlocked: z.array(z.string()).nullable(),
});

// Version 2 (step 1 and 2): signals, claims and words. A version 1 row is read again rather than shown half empty.
const saved = z.object({
  version: z.literal(2),
  status: z.enum(["read", "blocked", "unreachable"]),
  services: z.array(z.object({ name: z.string(), page: z.string().nullable(), quote: z.string().nullable() })),
  hasPhone: z.boolean().nullable(),
  hasAddress: z.boolean().nullable(),
  signals: signals.nullable(),
  claims: z.array(z.object({ key: z.string(), label: z.string(), page: z.string(), quote: z.string() })),
  words: z.array(z.string()),
});

/** What the screens use from a saved read. */
export type SavedSite = z.infer<typeof saved> & { domain: string; fetchedAt: string };

/** Null when the row is not one this version wrote, so it is read again rather than misread. */
export function toSavedSite(row: { domain: string; data: unknown; fetched_at: string }): SavedSite | null {
  const parsed = saved.safeParse(row.data);
  return parsed.success ? { ...parsed.data, domain: row.domain, fetchedAt: row.fetched_at } : null;
}

/** What a website_facts row holds: a finished read, a check still running, or nothing usable (an older format). */
export type SiteState = { kind: "done"; site: SavedSite } | { kind: "reading"; since: string } | { kind: "unusable"; since: string };

export function siteState(row: { domain: string; data: unknown; fetched_at: string }): SiteState {
  const site = toSavedSite(row);
  if (site) return { kind: "done", site };
  const reading = !!row.data && typeof row.data === "object" && (row.data as { reading?: unknown }).reading === true;
  return { kind: reading ? "reading" : "unusable", since: row.fetched_at };
}

/** A claim that may be taken over: one left by a check that never finished, or a row no screen can use. */
export function canTakeOver(state: SiteState, now: Date): boolean {
  if (state.kind === "done") return false;
  return state.kind === "unusable" || now.getTime() - Date.parse(state.since) > READING_STALE_MS;
}

/**
 * The website we may read for a competitor: the one the user typed, or a site the saved AI answers cited (matched to
 * the competitor by name on the page). Anything else is refused, so the button can never be used to read any address.
 */
export function allowedDomain(asked: string, competitorDomain: string | null, citedHosts: Set<string>): string | null {
  const host = hostOf(asked);
  if (!host) return null;
  const typed = competitorDomain ? hostOf(competitorDomain) : null;
  return host === typed || citedHosts.has(host) ? host : null;
}
