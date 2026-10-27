import type { ProviderId } from "@/modules/scanning";
import { SOURCE_TYPE_LABELS, SUB_KIND_LABELS, SUB_KIND_PLURALS, hostOf, sourceType, subKind, type SourceType, type SubKind } from "./classify";
import { competitorSiteOwner, type TrackedCompetitor } from "./competitor-sites";
import { MODEL_ORDER } from "./tools";

// What the Sources page shows (B-54, MVP_SPEC 8.1; dashboard redesign 2026-10-27). Pure, so every state is unit tested.

export const MAX_SITES = 50;
/** "Top 10 sources that mention you". */
export const TOP_SOURCES = 10;
const TOP_NAMES = 2;

const TYPE_ORDER: SourceType[] = ["reviews", "directories", "news", "business", "own"];

/** One saved check: which AI answered and the citations it gave, as stored (`cited_sources`). */
export type SourceCheck = {
  provider: string;
  citations: unknown;
  checkedAt: string;
  /** The score's answer key (provider and answer text): a cached answer saved twice counts once. */
  answerKey?: string;
  /** Whether the answer named the business. */
  mentioned?: boolean;
  /** Businesses the answer recommended, by display name; the business's own name when it was named. */
  names?: string[];
};

export type SourcesContext = {
  ownDomain: string | null;
  businessName?: string | null;
  competitors?: TrackedCompetitor[];
  /** Only this AI tool's answers; null for all tools. */
  tool?: ProviderId | null;
};

/** "own": the business's site. "competitor": a competitor's own site. Otherwise how often AI named you when it used it. */
export type MentionsYou = "own" | "competitor" | "no" | "sometimes" | "always";

export const MENTIONS_LABELS: Record<MentionsYou, string> = {
  own: "Your site",
  competitor: "Their own site",
  no: "No",
  sometimes: "Sometimes",
  always: "Always",
};

export type Site = {
  host: string;
  type: SourceType;
  typeLabel: string;
  kind: SubKind;
  kindLabel: string;
  /** Answers that cited this site at least once. */
  answers: number;
  /** Of those, answers that did not name the business. */
  answersWithoutYou: number;
  models: ProviderId[];
  mentions: MentionsYou;
  /** The businesses those answers named most, most named first. */
  names: string[];
  /** The tracked competitor whose site this is, for the Compare link. */
  competitorId: string | null;
};

export type SourcesView = {
  /** Answers saved in the window, with or without citations (only the picked AI tool's). */
  answers: number;
  /** Answers from every AI tool, to tell "no scans yet" from "this tool gave no answers". */
  answersAllTools: number;
  answersWithSources: number;
  ownSite: { host: string | null; answers: number };
  types: { type: SourceType; label: string; sites: number; answers: number; kinds: string[] }[];
  sites: Site[];
  /** Sites left out after the first MAX_SITES. */
  moreSites: number;
  lastCheckedAt: string | null;
  /** Every site AI used, not only the ones listed. */
  sitesUsed: number;
  topSource: { host: string; answers: number } | null;
  /** Of the most used sites (not your own), the ones used in answers that named you. */
  topMentioning: { count: number; of: number; hosts: string[] };
  /** Times AI used a competitor's own site: one per site per answer. */
  competitorSiteTimes: number;
};

/** Hosts cited in one answer, each once, however many of its pages the answer linked. */
export function citedHosts(citations: unknown): string[] {
  if (!Array.isArray(citations)) return [];
  const hosts = new Set<string>();
  for (const c of citations) {
    const url = typeof c === "string" ? c : (c as { url?: unknown } | null)?.url;
    const host = typeof url === "string" ? hostOf(url) : null;
    if (host) hosts.add(host);
  }
  return [...hosts];
}

const isModel = (p: string): p is ProviderId => (MODEL_ORDER as string[]).includes(p);

/** Each answer once, the way the score counts them (BUG-129): a cached answer saved again is the same answer. */
export function uniqueAnswers(checks: SourceCheck[]): SourceCheck[] {
  const seen = new Set<string>();
  return checks.filter((c) => {
    if (!c.answerKey) return true;
    if (seen.has(c.answerKey)) return false;
    seen.add(c.answerKey);
    return true;
  });
}

export function mentionsYou(kind: SubKind, answers: number, withoutYou: number): MentionsYou {
  if (kind === "own") return "own";
  if (kind === "competitor") return "competitor";
  if (withoutYou >= answers) return "no";
  return withoutYou === 0 ? "always" : "sometimes";
}

type Tally = { answers: number; withoutYou: number; models: Set<ProviderId>; names: Map<string, number> };

export function sourcesView(allChecks: SourceCheck[], ctx: SourcesContext): SourcesView {
  const { ownDomain, tool = null } = ctx;
  const unique = uniqueAnswers(allChecks);
  // Competitor sites come from every answer, so switching the tool filter never changes a site's kind.
  const you = ctx.businessName ?? null;
  const aiNamed = [...new Set(unique.flatMap((c) => c.names ?? []))].filter((n) => n !== you);
  const checks = tool ? unique.filter((c) => c.provider === tool) : unique;

  const byHost = new Map<string, Tally>();
  const answersByType = new Map<SourceType, number>();
  let answersWithSources = 0;
  let lastCheckedAt: string | null = null;

  for (const check of checks) {
    if (!lastCheckedAt || check.checkedAt > lastCheckedAt) lastCheckedAt = check.checkedAt;
    const hosts = citedHosts(check.citations);
    if (hosts.length > 0) answersWithSources++;
    const typesCited = new Set<SourceType>();
    const names = [...new Set(check.names ?? [])];
    for (const host of hosts) {
      const t = byHost.get(host) ?? { answers: 0, withoutYou: 0, models: new Set<ProviderId>(), names: new Map<string, number>() };
      t.answers++;
      if (!check.mentioned) t.withoutYou++;
      if (isModel(check.provider)) t.models.add(check.provider);
      for (const n of names) t.names.set(n, (t.names.get(n) ?? 0) + 1);
      byHost.set(host, t);
      typesCited.add(sourceType(host, ownDomain));
    }
    for (const type of typesCited) answersByType.set(type, (answersByType.get(type) ?? 0) + 1);
  }

  const sites: Site[] = [...byHost]
    .map(([host, t]) => {
      const type = sourceType(host, ownDomain);
      const owner = competitorSiteOwner(host, ownDomain, ctx.competitors ?? [], aiNamed);
      const kind = subKind(host, ownDomain, !!owner);
      return {
        host,
        type,
        typeLabel: SOURCE_TYPE_LABELS[type],
        kind,
        kindLabel: SUB_KIND_LABELS[kind],
        answers: t.answers,
        answersWithoutYou: t.withoutYou,
        models: MODEL_ORDER.filter((m) => t.models.has(m)),
        mentions: mentionsYou(kind, t.answers, t.withoutYou),
        names: topNames(t.names),
        competitorId: kind === "competitor" ? (owner?.competitorId ?? null) : null,
      };
    })
    .sort((a, b) => b.answers - a.answers || a.host.localeCompare(b.host));

  const types = TYPE_ORDER.map((type) => {
    const ofType = sites.filter((s) => s.type === type);
    const kinds = [...new Set(ofType.map((s) => s.kind))].filter((k) => k !== "own").map((k) => SUB_KIND_PLURALS[k]);
    return { type, label: SOURCE_TYPE_LABELS[type], sites: ofType.length, answers: answersByType.get(type) ?? 0, kinds };
  }).filter((t) => t.sites > 0);

  const top = sites.filter((s) => s.kind !== "own").slice(0, TOP_SOURCES);
  const mentioning = top.filter((s) => s.mentions === "sometimes" || s.mentions === "always");

  return {
    answers: checks.length,
    answersAllTools: unique.length,
    answersWithSources,
    ownSite: { host: ownDomain ? hostOf(ownDomain) : null, answers: answersByType.get("own") ?? 0 },
    types,
    sites: sites.slice(0, MAX_SITES),
    moreSites: Math.max(0, sites.length - MAX_SITES),
    lastCheckedAt,
    sitesUsed: sites.length,
    topSource: sites[0] ? { host: sites[0].host, answers: sites[0].answers } : null,
    topMentioning: { count: mentioning.length, of: top.length, hosts: mentioning.map((s) => s.host) },
    competitorSiteTimes: sites.filter((s) => s.kind === "competitor").reduce((sum, s) => sum + s.answers, 0),
  };
}

function topNames(names: Map<string, number>): string[] {
  return [...names]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_NAMES)
    .map(([n]) => n);
}

/** "Cited in 12 of 36 answers" style wording for how often a site came up. */
export function answersText(cited: number, total: number): string {
  return `${cited} of ${total} ${total === 1 ? "answer" : "answers"}`;
}
