import type { ProviderId } from "@/modules/scanning";
import { SOURCE_TYPE_LABELS, hostOf, sourceType, type SourceType } from "./classify";

// What the Sources page shows (B-54, MVP_SPEC 8.1). Pure, so every state is unit tested.

export const MAX_SITES = 50;

const MODEL_ORDER: ProviderId[] = ["openai", "anthropic", "perplexity"];
const TYPE_ORDER: SourceType[] = ["reviews", "directories", "news", "business", "own"];

/** One saved check: which AI answered and the citations it gave, as stored (`cited_sources`). */
export type SourceCheck = { provider: string; citations: unknown; checkedAt: string };

export type Site = {
  host: string;
  type: SourceType;
  typeLabel: string;
  /** Answers that cited this site at least once. */
  answers: number;
  models: ProviderId[];
};

export type SourcesView = {
  /** Answers saved in the window, with or without citations. */
  answers: number;
  answersWithSources: number;
  ownSite: { host: string | null; answers: number };
  types: { type: SourceType; label: string; sites: number; answers: number }[];
  sites: Site[];
  /** Sites left out after the first MAX_SITES. */
  moreSites: number;
  lastCheckedAt: string | null;
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

export function sourcesView(checks: SourceCheck[], ownDomain: string | null): SourcesView {
  const byHost = new Map<string, { type: SourceType; answers: number; models: Set<ProviderId> }>();
  const answersByType = new Map<SourceType, number>();
  let answersWithSources = 0;
  let lastCheckedAt: string | null = null;

  for (const check of checks) {
    if (!lastCheckedAt || check.checkedAt > lastCheckedAt) lastCheckedAt = check.checkedAt;
    const hosts = citedHosts(check.citations);
    if (hosts.length > 0) answersWithSources++;
    const typesCited = new Set<SourceType>();
    for (const host of hosts) {
      const entry = byHost.get(host) ?? { type: sourceType(host, ownDomain), answers: 0, models: new Set<ProviderId>() };
      entry.answers++;
      if (isModel(check.provider)) entry.models.add(check.provider);
      byHost.set(host, entry);
      typesCited.add(entry.type);
    }
    for (const type of typesCited) answersByType.set(type, (answersByType.get(type) ?? 0) + 1);
  }

  const sites: Site[] = [...byHost]
    .map(([host, e]) => ({
      host,
      type: e.type,
      typeLabel: SOURCE_TYPE_LABELS[e.type],
      answers: e.answers,
      models: MODEL_ORDER.filter((m) => e.models.has(m)),
    }))
    .sort((a, b) => b.answers - a.answers || a.host.localeCompare(b.host));

  const types = TYPE_ORDER.map((type) => ({
    type,
    label: SOURCE_TYPE_LABELS[type],
    sites: sites.filter((s) => s.type === type).length,
    answers: answersByType.get(type) ?? 0,
  })).filter((t) => t.sites > 0);

  return {
    answers: checks.length,
    answersWithSources,
    ownSite: { host: ownDomain ? hostOf(ownDomain) : null, answers: answersByType.get("own") ?? 0 },
    types,
    sites: sites.slice(0, MAX_SITES),
    moreSites: Math.max(0, sites.length - MAX_SITES),
    lastCheckedAt,
  };
}

/** "Cited in 12 of 36 answers" style wording for how often a site came up. */
export function answersText(cited: number, total: number): string {
  return `${cited} of ${total} ${total === 1 ? "answer" : "answers"}`;
}
