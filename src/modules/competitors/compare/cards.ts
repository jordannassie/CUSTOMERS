// Compare's reason cards (dashboard redesign brief): each likely reason as a fact with its answer count on the left and
// "What to do" on the right, with where to apply it, the impact, and what "Add to Actions" saves. Pure.
import { attachFixes, type FixRef } from "@/lib/fix-match";
import { WHERE_LABEL } from "@/lib/fix-where";
import type { Fact } from "@/modules/standing";

export type Impact = "high" | "medium" | "low";

export type ReasonCard = {
  /** Shared with Actions ("site:yelp.com"), so the button can say "In Actions · To do". */
  key: string;
  tag: string;
  /** "Based on 9 answers", "Based on the website check", "Based on Google's listing". */
  basis: string;
  title: string;
  fact: string;
  whatToDo: string;
  whereToApply: string;
  impact: Impact;
  /** /questions filtered to the answers behind it; null when it rests on a website check or Google. */
  answersHref: string | null;
  /** The open saved fix that deals with this reason (matched by lib/fix-match.ts) and its saved status; null when none. */
  fix: { id: string; status: string } | null;
  /** What "Add to Actions" saves. */
  action: { title: string; category: string; evidenceData: { [key: string]: string | number | null } };
};

export type LeadCard = { title: string; fact: string };

const answers = (n: number) => `${n} ${n === 1 ? "answer" : "answers"}`;

export function impactOf(weight: number): Impact {
  if (weight >= 4) return "high";
  if (weight >= 2) return "medium";
  return "low";
}

/** The step as a short task title: "Claim or update your listing on yelp.com". */
export function taskTitle(action: string): string {
  const first = action.split(/[:.](\s|$)/)[0].trim();
  if (first.length <= 90) return first;
  // A clean cut at a word, no ellipsis (WRITING.md), without a dangling comma or "and".
  return first
    .slice(0, 91)
    .replace(/\s+\S*$/, "")
    .replace(/[\s,;:]+(and|or|to|the|a|an|of|for|on|in|with)?$/i, "")
    .replace(/[\s,;:]+$/, "");
}

function categoryOf(f: Fact): string {
  const key = f.key ?? "";
  if (key.startsWith("google:reviews") || key.startsWith("google:rating")) return "reviews_reputation";
  if (key.startsWith("google:")) return "local_presence";
  if (key === "web:businessSchema") return "structured_data";
  if (key === "web:blocked" || key === "web:ai-blocked") return "technical";
  if (key.startsWith("web:service:")) return "service_page";
  if (f.where === "other_places") return "citations";
  if (f.where === "google_listing") return "local_presence";
  return "content";
}

function whereToApply(f: Fact, ownDomain: string | null): string {
  const key = f.key ?? "";
  if (key.startsWith("site:")) return key.slice(5);
  if (f.where === "google_listing") return "Google Business Profile";
  if (f.where === "other_places") return f.match?.[0] ?? "Review and listing sites";
  return ownDomain ? `${ownDomain}, your website` : "Your website";
}

function basisOf(f: Fact): string {
  if (typeof f.answers === "number") return `Based on ${answers(f.answers)}`;
  if (f.basis === "google") return "Based on Google's listing";
  if (f.basis === "website") return "Based on the website check";
  return "Based on AI answers";
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Links to /questions, matching the Questions page's ?site= and ?named= filters. */
function answersHref(f: Fact, competitor: string): string | null {
  const key = f.key ?? "";
  if (f.basis === "website" || f.basis === "google") return null;
  const params = new URLSearchParams();
  if (key.startsWith("site:")) params.set("site", key.slice(5));
  params.set("named", competitor);
  // "ChatGPT names them more": that tool's answers, the ones its numbers count.
  if (f.provider) params.set("ai", f.provider);
  return `/questions?${params.toString()}`;
}

const list = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/**
 * One reason per fix: an AI tool's reason that points at a site with its own reason ("ChatGPT used yelp.com most")
 * joins that site's card, so the same fix is never offered twice. Biggest evidence first, the engine's order.
 */
export function mergeReasons(reasons: Fact[]): Fact[] {
  const kept = new Map<string, Fact & { tools: string[] }>();
  for (const f of reasons) {
    const key = f.key ?? `reason:${slug(f.title)}`;
    const first = kept.get(key);
    if (!first) kept.set(key, { ...f, tools: f.assistant ? [f.assistant] : [] });
    else if (f.assistant) first.tools.push(f.assistant);
  }
  return [...kept.values()].map(({ tools, ...f }) => {
    // A card that now stands for several AI tools is no longer one tool's answers.
    if (tools.length > 1) delete f.provider;
    if (f.assistant || tools.length === 0 || !f.key?.startsWith("site:")) return f;
    const host = f.key.slice(5);
    return { ...f, text: `${f.text} ${list(tools)} ${tools.length === 1 ? "names" : "name"} them more and used ${host} most in those answers.` };
  });
}

/**
 * Every reason as a card, biggest evidence first (the engine's order), and the leads as short cards. `fixes`: the open
 * saved fixes with their status, so a reason already tied to one (fixId) says it is in Actions instead of adding a copy.
 */
export function reasonCards(
  reasons: Fact[],
  /** name: as AI says it, for the text; tracked: the name saved answers use, for the "See the answers" link. */
  competitor: { id: string; name: string; tracked?: string },
  ownDomain: string | null,
  fixes: { id: string; status: string }[] = [],
): ReasonCard[] {
  const statusOf = new Map(fixes.map((x) => [x.id, x.status]));
  return mergeReasons(reasons).map((f) => {
    const status = f.fixId ? statusOf.get(f.fixId) : undefined;
    // A reason with no step of its own starts where its facts are: the questions that name them ("See the answers").
    const whatToDo =
      f.action ??
      `Open the questions where AI names ${competitor.name}. Note the facts those answers give about them, then add the same facts about you to your Google Business Profile and website.`;
    const key = f.key ?? `reason:${slug(f.title)}`;
    return {
      key,
      tag: f.where ? WHERE_LABEL[f.where] : "AI answers",
      basis: basisOf(f),
      title: f.title,
      fact: f.text,
      whatToDo,
      whereToApply: whereToApply(f, ownDomain),
      impact: impactOf(f.weight),
      answersHref: answersHref(f, competitor.tracked ?? competitor.name),
      fix: f.fixId && status ? { id: f.fixId, status } : null,
      action: {
        title: taskTitle(whatToDo),
        category: categoryOf(f),
        evidenceData: { competitorId: competitor.id, competitor: competitor.name, answers: f.answers ?? null, reason: key },
      },
    };
  });
}

/**
 * Google reasons as cards, each tied to the open saved fix that deals with it (the scan's "Ask for Google reviews"),
 * so "Add to Actions" shows that fix instead of saving a second copy.
 */
export function googleReasonCards(facts: Fact[], competitor: { id: string; name: string }, fixes: (FixRef & { status: string })[]): ReasonCard[] {
  return reasonCards(attachFixes(facts, fixes), competitor, null, fixes);
}

export function leadCards(leads: Fact[]): LeadCard[] {
  return leads.map((f) => ({ title: f.title, fact: f.text }));
}
