// Compare's reason cards (dashboard redesign brief): each likely reason as a fact with its answer count on the left and
// "What to do" on the right, with where to apply it, the impact, and what "Add to Actions" saves. Pure.
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
  /** What "Add to Actions" saves. */
  action: { title: string; category: string; evidenceData: { [key: string]: string | number | null } };
};

export type LeadCard = { title: string; fact: string };

const TAG: Record<string, string> = { website: "Website", google_listing: "Google listing", other_places: "Other places AI looks" };
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
  return `${first.slice(0, 87).replace(/\s+\S*$/, "")}...`;
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
    if (f.assistant || tools.length === 0 || !f.key?.startsWith("site:")) return f;
    const host = f.key.slice(5);
    return { ...f, text: `${f.text} ${list(tools)} ${tools.length === 1 ? "names" : "name"} them more and used ${host} most in those answers.` };
  });
}

/** Every reason as a card, biggest evidence first (the engine's order), and the leads as short cards. */
export function reasonCards(reasons: Fact[], competitor: { id: string; name: string }, ownDomain: string | null): ReasonCard[] {
  return mergeReasons(reasons).map((f) => {
    const whatToDo = f.action ?? "Look at the answers behind this and add what they show about them to your own listings and website.";
    const key = f.key ?? `reason:${slug(f.title)}`;
    return {
      key,
      tag: f.where ? TAG[f.where] : "AI answers",
      basis: basisOf(f),
      title: f.title,
      fact: f.text,
      whatToDo,
      whereToApply: whereToApply(f, ownDomain),
      impact: impactOf(f.weight),
      answersHref: answersHref(f, competitor.name),
      action: {
        title: taskTitle(whatToDo),
        category: categoryOf(f),
        evidenceData: { competitorId: competitor.id, competitor: competitor.name, answers: f.answers ?? null, reason: key },
      },
    };
  });
}

export function leadCards(leads: Fact[]): LeadCard[] {
  return leads.map((f) => ({ title: f.title, fact: f.text }));
}
