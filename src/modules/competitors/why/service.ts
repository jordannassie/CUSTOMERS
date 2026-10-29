// "See why" on the Competitors page: the standing in one sentence and the saved fixes that are about this competitor.
// Pure. The facts themselves come from the standing module, over answers the scans already saved.
import { CLAIMS, meaningWords } from "@/lib/site-claims";
import type { Standing } from "@/modules/scanning";
import { questionLine, serviceGaps, type CompetitorWhy, type Fact, type TheirWebsite, type YourSite } from "@/modules/standing";
import type { FixLink, OpenFixRef } from "./fixes";

export type { FixLink, OpenFixRef } from "./fixes";

/** trackedName: the competitor as tracked, which the leaderboard row is named by; why.name is the name AI used. */
/** Their website on the panel: where it is, whether and when it was checked, and what it lists. */
export type WebsiteView = {
  domain: string | null;
  status: TheirWebsite["status"] | null;
  checkedAt: string | null;
  /** Read once and kept: no screen offers a second read (D-85). */
  checked: boolean;
  /** A check is reading it right now, from another tab or button. */
  checking: boolean;
  /** Their services; `onlyThem` when nothing on your website's list matches; the page and words it was found in. */
  services: ServiceChip[];
  /** "What their website says": each claim either site makes (24/7, free estimates), with the words it was found in. */
  claims: ClaimRow[];
  /** Them and you on each website check (step 1); null before theirs was read with them. */
  compare: CompareRow[] | null;
};

/**
 * One of their services, and what your site says about it: your matching service (with its words when a check read
 * your site), "mentioned" when your pages use its words outside your services, false when not, null when unknown.
 */
export type ServiceChip = {
  name: string;
  onlyThem: boolean;
  page: string | null;
  quote: string | null;
  yours: { name: string; page: string | null; quote: string | null } | "mentioned" | false | null;
};

/** One claim, side by side. `you` is null when your site wasn't read the same way, so we can't say. */
export type ClaimRow = {
  key: string;
  label: string;
  them: { page: string; quote: string } | false;
  you: { page: string; quote: string } | false | null;
};

/** One line of the website table: yes or no, a word count, or null when that side couldn't be checked. */
export type CompareRow = { label: string; them: boolean | number | null; you: boolean | number | null };

/** fixRefs: the open fixes, cut to what matching needs, so a reason found later (Google) can find its fix too. */
export type WhyPanel = {
  competitorId: string;
  trackedName: string;
  why: CompetitorWhy;
  fixes: FixLink[];
  fixRefs: OpenFixRef[];
  website: WebsiteView;
};

const MAX_CHIPS = 10;

/** Their services as chips, the ones yours doesn't list marked; none marked when we haven't read your site. */
type QuotedService = { name: string; page: string | null; quote?: string | null };

export function serviceChips(
  theirs: Omit<TheirWebsite, "services"> & { services: QuotedService[] },
  yours: YourSite,
  /** Your services with their words, when a check read your site the same way. */
  ownServices: QuotedService[] = [],
): WebsiteView["services"] {
  const gaps = new Set(yours.read ? serviceGaps(theirs, yours).map((s) => s.name) : []);
  const ownWords = new Set(yours.words ?? []);
  const yoursFor = (name: string): ServiceChip["yours"] => {
    if (!yours.read) return null;
    const want = meaningWords(name);
    const shares = (other: string) => meaningWords(other).some((w) => want.includes(w));
    const quoted = ownServices.find((o) => shares(o.name));
    if (quoted) return { name: quoted.name, page: quoted.page, quote: quoted.quote ?? null };
    const listed = yours.services.find(shares);
    if (listed) return { name: listed, page: null, quote: null };
    return want.length > 0 && want.every((w) => ownWords.has(w)) ? "mentioned" : false;
  };
  return theirs.services
    .slice(0, MAX_CHIPS)
    .map((s) => ({ name: s.name, onlyThem: gaps.has(s.name), page: s.page, quote: s.quote ?? null, yours: yoursFor(s.name) }));
}

/** Every claim either site makes, in a fixed order, with each side's words; none when theirs wasn't read with them. */
export function claimRows(theirs: TheirWebsite, yours: YourSite): ClaimRow[] {
  if (theirs.status !== "read" || !theirs.claims) return [];
  const mine = yours.read && yours.claims ? yours.claims : null;
  return CLAIMS.flatMap(({ key, label }) => {
    const t = theirs.claims!.find((c) => c.key === key);
    const y = mine?.find((c) => c.key === key);
    if (!t && !y) return [];
    return [
      {
        key,
        label,
        them: t ? { page: t.page, quote: t.quote } : false,
        you: mine === null ? null : y ? { page: y.page, quote: y.quote } : false,
      },
    ];
  });
}

const answers = (n: number) => `${n} ${n === 1 ? "answer" : "answers"}`;

/** "AI named Bean Tires in 12 of 40 answers over the last 30 days, and you in 5." */
export function standingSentence(why: Pick<CompetitorWhy, "name" | "answers" | "them" | "you">, standing: Standing | null): string {
  if (why.answers === 0) return "There are no answers from the last 30 days to compare yet.";
  const counts =
    standing === "ahead"
      ? `AI named you in ${why.you} of ${answers(why.answers)} over the last 30 days, and ${why.name} in ${why.them}.`
      : `AI named ${why.name} in ${why.them} of ${answers(why.answers)} over the last 30 days, and you in ${why.you}.`;
  return standing === "about_same" ? `${counts} That gap is too small to call.` : counts;
}

/** The Overview's "Why they're ahead" card: one competitor, its clearest facts, and a link to the full panel. */
export type WhyCard = {
  competitorId: string;
  name: string;
  /** behind: you are behind this competitor; ahead: you lead every competitor compared. */
  side: "behind" | "ahead";
  /** "On "best tire shop in Dallas", AI named Bean Tires in 5 of 6 answers and you in 0." */
  question: string | null;
  facts: Fact[];
};

const MAX_FACTS = 2;

/**
 * The competitor furthest ahead of you, from the leaderboard's own standing (never re-decided here). When you lead
 * them all, the one closest behind you. Null while no competitor is compared over the whole window.
 */
export function whyCard(rows: { name: string; isYou: boolean; score: number | null; standing: Standing | null }[], panels: WhyPanel[]): WhyCard | null {
  const compared = rows.filter((r) => !r.isYou && r.standing !== null && r.score !== null);
  const ahead = compared.filter((r) => r.standing === "behind").sort((a, b) => b.score! - a.score!)[0];
  const row = ahead ?? (compared.every((r) => r.standing === "ahead") ? [...compared].sort((a, b) => b.score! - a.score!)[0] : undefined);
  const panel = row && panels.find((p) => p.trackedName === row.name);
  if (!row || !panel) return null;
  const { why } = panel;
  if (ahead) {
    const q = why.questionsTheyWin[0];
    return {
      competitorId: panel.competitorId,
      name: why.name,
      side: "behind",
      question: q ? questionLine(q, why.name) : null,
      facts: why.reasons.slice(0, MAX_FACTS),
    };
  }
  return { competitorId: panel.competitorId, name: why.name, side: "ahead", question: null, facts: why.youLead.slice(0, MAX_FACTS) };
}

/** The first sentence of a fact: "AI used yelp.com in 9 answers that named Bean House and not you." */
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

/**
 * One line for the report, its PDF and the weekly email, from the Overview card's data (saved answers only, so no
 * Google values): "A likely reason Bean House is ahead of you: AI used yelp.com in 9 answers ...". Null without a fact.
 */
export function whySentence(card: WhyCard | null | undefined): string | null {
  const fact = card?.facts[0];
  if (!card || !fact) return null;
  const lead = card.side === "behind" ? `A likely reason ${card.name} is ahead of you` : `A likely reason you are ahead of ${card.name}`;
  // Names (AI, Google, a business) keep their capital; only a plain opening word is lowered after the colon.
  return `${lead}: ${firstSentence(fact.text).replace(/^(Your|The) /, (w) => w.toLowerCase())}`;
}

type Signals = NonNullable<TheirWebsite["signals"]>;

/** Your saved read, as the comparison needs it; undefined when there is none or the site turned us away. */
export function ownSite(row: (TheirWebsite & { services: { name: string }[] }) | undefined): YourSite | undefined {
  if (!row || row.status !== "read") return undefined;
  return {
    read: true,
    services: row.services.map((s) => s.name),
    hasPhone: row.hasPhone,
    hasAddress: row.hasAddress,
    signals: row.signals ?? null,
    claims: row.claims ?? [],
    words: row.words ?? [],
  };
}

const ROWS: { label: string; value: (s: Signals) => boolean | number | null }[] = [
  { label: "Lets AI tools read it", value: (s) => (s.aiBlocked === null ? null : s.aiBlocked.length === 0) },
  { label: "Business details for AI", value: (s) => s.businessSchema },
  { label: "FAQ section", value: (s) => s.faq },
  { label: "Customer reviews", value: (s) => s.reviews },
  { label: "Opening hours", value: (s) => s.hours },
  { label: "Contact or booking form", value: (s) => s.contactForm },
  { label: "Words on the pages we read", value: (s) => s.words },
];

/** The website table: each check for them and you; your column empty until your site was read the same way. */
export function compareRows(theirs: TheirWebsite, yours: YourSite): CompareRow[] | null {
  if (theirs.status !== "read" || !theirs.signals) return null;
  const mine = yours.read ? (yours.signals ?? null) : null;
  return ROWS.map((r) => ({ label: r.label, them: r.value(theirs.signals!), you: mine ? r.value(mine) : null }));
}
