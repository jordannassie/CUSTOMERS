// Their website against yours, beyond services (B-91 step 1 and 2). Pure. Step 1: what each site shows AI tools
// (robots.txt, business details in the page code, FAQ, reviews, hours, a form, how much it says). Step 2: for each
// question they win, whether their site says what the question asks and yours doesn't. Both sides are read the same way;
// "on the pages we read", never "missing from your site" (BUG-115).
import { claimsAskedBy, meaningWords } from "@/lib/site-claims";
import type { Fact } from "./reasons";

export type SignalSet = {
  businessSchema: boolean;
  contactForm: boolean;
  reviews: boolean;
  faq: boolean;
  hours: boolean;
  words: number;
  aiBlocked: string[] | null;
};

export type ClaimSet = { key: string; label: string; page: string; quote: string }[];

type Check = {
  key: Exclude<keyof SignalSet, "words" | "aiBlocked">;
  title: string;
  youTitle: string;
  detail: string;
  weight: number;
  action: string;
  match: string[];
};

const CHECKS: Check[] = [
  {
    key: "businessSchema",
    title: "Their website has business details for AI",
    youTitle: "Your website has business details for AI",
    detail: "Website info for AI in the page code says what the business is and where.",
    weight: 3,
    action: "Add website info for AI to your home page code: your name, address, phone, hours and services. Your web designer or site builder can add it.",
    // Saved fixes about this name it in the words of their own category.
    match: ["schema", "json-ld", "website info for ai", "markup"],
  },
  {
    key: "faq",
    title: "Their website answers common questions",
    youTitle: "Your website answers common questions",
    detail: "An FAQ section, which AI tools often quote.",
    weight: 2.5,
    action: "Add an FAQ section to your website that answers the questions customers ask most.",
    match: ["faq", "frequently asked"],
  },
  {
    key: "reviews",
    title: "Their website shows customer reviews",
    youTitle: "Your website shows customer reviews",
    detail: "Reviews or testimonials on the site itself.",
    weight: 2,
    action: "Show a few real customer reviews on your website, for example on the home page.",
    match: ["testimonial", "reviews on your website", "reviews on your site"],
  },
  {
    key: "hours",
    title: "Their website lists opening hours",
    youTitle: "Your website lists opening hours",
    detail: "Hours written on the site, not only on Google.",
    weight: 1.5,
    action: "Write your opening hours on your website, for example on the contact page.",
    match: ["hours"],
  },
  {
    key: "contactForm",
    title: "Their website has a contact or booking form",
    youTitle: "Your website has a contact or booking form",
    detail: "A form customers can send from the site.",
    weight: 1,
    action: "Add a contact or booking form to your website.",
    match: ["form", "booking"],
  },
];

const NOT_YOURS = "We didn't find it on the pages we read of yours.";
const MIN_WORDS = 300;
const list = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** Step 1: each check one side shows and the other doesn't, as a likely reason or as your lead. */
export function signalFacts(theirs: SignalSet | null, yours: SignalSet | null): { behind: Fact[]; ahead: Fact[] } {
  const behind: Fact[] = [];
  const ahead: Fact[] = [];
  if (!theirs || !yours) return { behind, ahead };
  if (yours.aiBlocked && yours.aiBlocked.length > 0 && theirs.aiBlocked?.length === 0) {
    behind.push({
      title: "Your website blocks some AI tools",
      detail: `Its robots.txt turns away ${list(yours.aiBlocked)}. Theirs lets them in.`,
      action: `Edit robots.txt on your website so ${list(yours.aiBlocked)} can read it.`,
      match: ["robots", "gptbot", "claudebot", "perplexitybot"],
      key: "web:ai-blocked",
      basis: "website",
      text: `Your website's robots.txt turns away ${list(yours.aiBlocked)}, and theirs lets AI tools in.`,
      where: "website",
      weight: 5,
    });
  }
  for (const c of CHECKS) {
    if (theirs[c.key] && !yours[c.key]) {
      behind.push({
        title: c.title,
        detail: `${c.detail} ${NOT_YOURS}`,
        text: `${c.title}. ${NOT_YOURS}`,
        where: "website",
        weight: c.weight,
        action: c.action,
        match: c.match,
        key: `web:${c.key}`,
        basis: "website",
      });
    } else if (yours[c.key] && !theirs[c.key]) {
      ahead.push({ title: c.youTitle, detail: "We didn't find it on theirs.", text: `${c.youTitle}, and we didn't find it on theirs.`, where: "website", weight: c.weight });
    }
  }
  if (theirs.words >= MIN_WORDS && theirs.words >= 2 * yours.words) {
    behind.push({
      title: "Their website says more",
      action: "Write more on your service pages: what you do, for whom, where, and prices or how to book.",
      match: ["content", "describe", "description", "more detail"],
      key: "web:words",
      basis: "website",
      detail: `About ${round(theirs.words)} words on the pages we read, yours about ${round(yours.words)}.`,
      text: `Their website has about ${round(theirs.words)} words on the pages we read, and yours about ${round(yours.words)}.`,
      where: "website",
      weight: 1.5,
    });
  }
  return { behind, ahead };
}

const round = (n: number) => (n < 100 ? n : Math.round(n / 10) * 10).toLocaleString("en-US");

const MAX_QUESTION_FACTS = 2;

/**
 * Step 2: for the questions they win, what the question asks that their site says and yours doesn't. A claim the
 * question is about ("open now" asks for 24/7 or emergency work) first, then the question's own words ("Plano").
 */
export function questionFacts(
  questionsTheyWin: { question: string }[],
  theirs: { claims: ClaimSet; words: string[] },
  yours: { claims: ClaimSet; words: string[] },
): Fact[] {
  const facts: Fact[] = [];
  const yourClaims = new Set(yours.claims.map((c) => c.key));
  const theirWords = new Set(theirs.words);
  const yourWords = new Set(yours.words);
  for (const { question } of questionsTheyWin) {
    if (facts.length === MAX_QUESTION_FACTS) break;
    const asked = claimsAskedBy(question);
    const claim = theirs.claims.find((c) => (asked as string[]).includes(c.key) && !yourClaims.has(c.key));
    if (claim) {
      facts.push({
        title: `Their website says ${claim.label}`,
        action: `If it's true for you, say "${claim.label}" on your website, near the services it applies to.`,
        match: claim.label.split(/\s+/).filter((w) => w.length > 3),
        key: `web:claim:${claim.key}`,
        basis: "website",
        detail: `They win "${question}". Yours doesn't say it. Theirs: "${claim.quote}"`,
        text: `They win "${question}", and their website says ${claim.label} ("${claim.quote}"). Yours doesn't say it.`,
        where: "website",
        weight: 5.5,
      });
      continue;
    }
    const words = [...new Set(meaningWords(question))].filter((w) => theirWords.has(w) && !yourWords.has(w));
    if (words.length > 0) {
      const shown = words.slice(0, 3).map((w) => `"${w}"`);
      facts.push({
        title: `Their website mentions ${list(shown)}`,
        action: `Mention ${list(shown)} on your website where it fits, for example on your services or contact page.`,
        match: words.slice(0, 3),
        key: `web:words:${words.slice(0, 3).join(",")}`,
        basis: "website",
        detail: `They win "${question}". Your website doesn't mention ${words.length === 1 ? "it" : "them"}.`,
        text: `They win "${question}", and their website mentions ${list(shown)}. Your website doesn't.`,
        where: "website",
        weight: 5,
      });
    }
  }
  return facts;
}
