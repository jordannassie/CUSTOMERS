// The facts Claude gets for "why competitors win" (MVP_SPEC 7.1, 7.2). Pure: built from one scan's
// saved checks, the business's own site facts and live Google signals. Google values go in only as
// comparisons and placeholder names, never as numbers (D-73).
import { z } from "zod";
import { compareCount, compareRating, openDays, sideOf, type GoogleSide } from "./compare";
import { PLACE_FIELDS, placeholderFor, type PlaceField } from "./placeholders";
import { citedSites, type CitedSite } from "./sites";
import { yourWebsite, type YourWebsite } from "./your-website";

export type Signals = {
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  hours: string[] | null;
};

export type CheckRow = {
  provider: string;
  question: string;
  businessMentioned: boolean;
  competitorsMentioned: unknown;
  citations: unknown;
};

export type { CitedSite };

export type ExplainSources = {
  business: {
    name: string;
    city: string | null;
    region: string | null;
    industry: string | null;
    domain: string | null;
    hasWebsite: boolean;
    description: string | null;
    services: string[];
    placesId: string | null;
  };
  competitors: { id: string; name: string; placesId: string | null }[];
  /** The AIs this scan asked (visibility_runs.provider); one with no saved checks could not be checked. */
  models?: string[];
  checks: CheckRow[];
  alsoNamed: { name: string; answers: number }[];
  siteFacts: unknown;
  /** Live Google signals by place id; missing or null when Google had nothing. Never stored. */
  signals: Map<string, Signals | null>;
};

export type ExplainInput = {
  business: {
    name: string;
    city: string | null;
    region: string | null;
    industry: string | null;
    website: string | null;
    hasWebsite: boolean;
    description: string | null;
    services: string[];
  };
  scan: {
    answers: number;
    answersNamingYou: number;
    byAssistant: { assistant: string; answers: number; answersNamingYou: number }[];
    /** Asked, but every check failed: no answers to count (BUG-077). */
    assistantsNotChecked: string[];
  };
  questions: { question: string; answers: number; answersNamingYou: number; competitorsNamed: string[] }[];
  competitors: {
    key: string;
    name: string;
    answersNamingThem: number;
    /** Who is ahead on each Google value, from the owner's side (BUG-099). */
    google: { reviewCount: GoogleSide; rating: GoogleSide; openDays: GoogleSide; sameCategory: boolean | null } | null;
  }[];
  alsoNamedByAI: { name: string; answers: number }[];
  citations: { yourSiteCitedIn: number | null; sites: CitedSite[] };
  yourWebsite: YourWebsite | null;
  placeholders: string[];
};

export type BuiltInput = {
  input: ExplainInput;
  /** Placeholder key ("c1") to business_competitors.id, for storage. */
  keys: Record<string, string>;
};

const ASSISTANTS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
const MAX_COMPETITORS = 5;
const MAX_QUESTIONS = 8;
const MAX_SITES = 8;

const mentions = z.array(z.object({ name: z.string(), mentioned: z.boolean() }));
const citations = z.array(z.object({ url: z.string() }));

const key = (s: string) => s.trim().toLowerCase();

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function namedIn(check: CheckRow): Set<string> {
  const parsed = mentions.safeParse(check.competitorsMentioned);
  return new Set(parsed.success ? parsed.data.filter((m) => m.mentioned).map((m) => key(m.name)) : []);
}

function citedDomains(check: CheckRow): Set<string> {
  const parsed = citations.safeParse(check.citations);
  const out = new Set<string>();
  for (const c of parsed.success ? parsed.data : []) {
    const d = domainOf(c.url);
    if (d) out.add(d);
  }
  return out;
}

function valueOf(s: Signals, field: PlaceField): boolean {
  if (field === "review_count") return s.reviewCount !== null;
  if (field === "rating") return s.rating !== null;
  if (field === "category") return s.categories.length > 0;
  return s.hours !== null;
}

export function buildExplainInput(src: ExplainSources): BuiltInput {
  const { business, checks } = src;
  const mentionSets = checks.map(namedIn);
  const citedSets = checks.map(citedDomains);
  const you = business.placesId ? (src.signals.get(business.placesId) ?? null) : null;
  const placeholders: string[] = [];
  if (you) for (const f of PLACE_FIELDS) if (valueOf(you, f)) placeholders.push(placeholderFor("you", f));

  const ranked = src.competitors
    .map((c) => ({ ...c, answers: mentionSets.filter((s) => s.has(key(c.name))).length }))
    .sort((a, b) => b.answers - a.answers || a.name.localeCompare(b.name))
    .slice(0, MAX_COMPETITORS);
  const keys: Record<string, string> = {};
  const competitors = ranked.map((c, i) => {
    const k = `c${i + 1}`;
    keys[k] = c.id;
    const theirs = c.placesId ? (src.signals.get(c.placesId) ?? null) : null;
    if (theirs) for (const f of PLACE_FIELDS) if (valueOf(theirs, f)) placeholders.push(placeholderFor(k, f));
    return {
      key: k,
      name: c.name,
      answersNamingThem: c.answers,
      google: theirs
        ? {
            reviewCount: sideOf(compareCount(theirs.reviewCount, you?.reviewCount ?? null)),
            rating: sideOf(compareRating(theirs.rating, you?.rating ?? null)),
            openDays: sideOf(compareCount(openDays(theirs.hours), you ? openDays(you.hours) : null, 0)),
            sameCategory: you ? theirs.categories.some((t) => you.categories.some((y) => key(t) === key(y))) : null,
          }
        : null,
    };
  });

  const byQuestion = new Map<string, { answers: number; named: number; competitors: Set<string> }>();
  checks.forEach((check, i) => {
    const q = byQuestion.get(check.question) ?? { answers: 0, named: 0, competitors: new Set<string>() };
    q.answers += 1;
    if (check.businessMentioned) q.named += 1;
    for (const c of src.competitors) if (mentionSets[i].has(key(c.name))) q.competitors.add(c.name);
    byQuestion.set(check.question, q);
  });
  const questions = [...byQuestion]
    .filter(([, q]) => q.named < q.answers)
    .sort((a, b) => b[1].answers - b[1].named - (a[1].answers - a[1].named) || a[0].localeCompare(b[0]))
    .slice(0, MAX_QUESTIONS)
    .map(([question, q]) => ({ question, answers: q.answers, answersNamingYou: q.named, competitorsNamed: [...q.competitors] }));

  const ownDomain = business.domain ? domainOf(`https://${business.domain.replace(/^https?:\/\//, "")}`) : null;
  const assistants = new Map<string, { answers: number; named: number }>();
  for (const check of checks) {
    const a = assistants.get(check.provider) ?? { answers: 0, named: 0 };
    a.answers += 1;
    if (check.businessMentioned) a.named += 1;
    assistants.set(check.provider, a);
  }

  return {
    keys,
    input: {
      business: {
        name: business.name,
        city: business.city,
        region: business.region,
        industry: business.industry,
        website: ownDomain,
        hasWebsite: business.hasWebsite,
        description: business.description,
        services: business.services,
      },
      scan: {
        answers: checks.length,
        answersNamingYou: checks.filter((c) => c.businessMentioned).length,
        byAssistant: [...assistants].map(([p, a]) => ({ assistant: ASSISTANTS[p] ?? p, answers: a.answers, answersNamingYou: a.named })),
        assistantsNotChecked: (src.models ?? []).filter((p) => !assistants.has(p)).map((p) => ASSISTANTS[p] ?? p),
      },
      questions,
      competitors,
      alsoNamedByAI: src.alsoNamed.slice(0, 5),
      citations: {
        yourSiteCitedIn: ownDomain ? citedSets.filter((s) => s.has(ownDomain)).length : null,
        sites: citedSites(citedSets, checks.map((c) => c.businessMentioned), ownDomain, [
          ...src.competitors.map((c) => c.name),
          ...src.alsoNamed.map((a) => a.name),
        ]).slice(0, MAX_SITES),
      },
      yourWebsite: yourWebsite(src.siteFacts),
      placeholders,
    },
  };
}
