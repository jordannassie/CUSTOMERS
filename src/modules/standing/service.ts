// Why AI names a competitor more or less than you (Phase A of the "why you are behind" plan). Pure, over answers the
// scans already saved: where they beat you (questions, AI tools), likely reasons with where to fix them, and where
// you lead. Ahead or behind itself is the leaderboard's call (scoring.ts compareWithCompetitor), never made here.
import { hostOf } from "@/lib/site-type";
import { namedIn, type StandingCheck } from "./checks";
import { googleFacts, siteFacts, theirSite, websiteFacts, type Fact, type GoogleValues } from "./reasons";
import { websiteChecks, websiteGaps, serviceGaps, type TheirWebsite, type YourSite } from "./website";
import { listingsArea, pagesUsed, quotesArea, sourceBreakdown, websiteArea, type Area, type SourceRow } from "./gap";

export type { Fact, GoogleValues, Where } from "./reasons";

export type Tally = { answers: number; them: number; you: number };
export type QuestionTally = Tally & { questionId: string; question: string };
export type AssistantTally = Tally & { provider: string; assistant: string };

export type CompetitorWhy = Tally & {
  name: string;
  /** Their own website when we know it: the one the user typed, or a cited site with their name. */
  site: string | null;
  /** Questions where AI named them more often than you, biggest gap first. */
  questionsTheyWin: QuestionTally[];
  questionsYouWin: QuestionTally[];
  /** AI tools that named them more often than you. */
  assistantsTheyWin: AssistantTally[];
  /** Every AI tool with answers, in a fixed order. */
  assistants: AssistantTally[];
  /** Likely reasons they are named more, most telling first, each with where you would fix it. */
  reasons: Fact[];
  /** Where you are ahead of them. */
  youLead: Fact[];
  /** Every likely reason and every lead, not only the top few (the comparison page). */
  allReasons: Fact[];
  allLeads: Fact[];
  /** The score's answers split by the kind of site AI used, biggest gap first (the facts behind the score). */
  sources: SourceRow[];
  /** Who leads in each place AI looks; the Google area is added by the page that has live Google values. */
  areas: Area[];
  /** Pages of their site, and of yours, that AI used in these answers. */
  theirPages: { path: string; answers: number }[];
  yourPages: { path: string; answers: number }[];
};

export type WhyInput = {
  /** Answers that count in the score (scores/counted.ts), in the 30-day window, for the business's AI tools. */
  checks: StandingCheck[];
  /** Question id to its wording now. */
  questions: Map<string, string>;
  you: { domain: string | null; websiteBlocked: boolean; site?: YourSite };
  /** name: the tracked name the saved answers are counted under. label: the name AI used, for a chain's branch the
   * chain ("Bennu Coffee" for "Bennu Coffee on Congress"); every sentence and site match uses it. */
  competitor: { name: string; domain: string | null; label?: string };
  /** What their own website says, when the owner checked it (website_facts, B-91). */
  theirWebsite?: TheirWebsite | null;
  /** Live Google values for this page view, when the page has them (Competitors page only). */
  google?: { theirs: GoogleValues | null; yours: GoogleValues | null };
};

export const ASSISTANTS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
const MAX_REASONS = 5;
const MAX_LEADS = 2;

function tally(checks: StandingCheck[], name: string): Tally {
  return { answers: checks.length, them: checks.filter((c) => namedIn(c, name)).length, you: checks.filter((c) => c.youNamed).length };
}

function groupBy(checks: StandingCheck[], key: (c: StandingCheck) => string): Map<string, StandingCheck[]> {
  const groups = new Map<string, StandingCheck[]>();
  for (const c of checks) groups.set(key(c), [...(groups.get(key(c)) ?? []), c]);
  return groups;
}

const gap = (t: Tally) => t.them - t.you;
const byGap = <T extends Tally>(a: T, b: T) => Math.abs(gap(b)) - Math.abs(gap(a)) || b.answers - a.answers;

export function questionTallies(checks: StandingCheck[], questions: Map<string, string>, name: string): QuestionTally[] {
  return [...groupBy(checks, (c) => c.questionId)].flatMap(([questionId, group]) => {
    const question = questions.get(questionId);
    return question ? [{ questionId, question, ...tally(group, name) }] : [];
  });
}

const questionsTheyWin = (questions: QuestionTally[]) => questions.filter((q) => gap(q) > 0).sort(byGap);

const of = (t: Tally, n: number) => `${n} of ${t.answers}`;

export function competitorWhy(input: WhyInput): CompetitorWhy {
  const { checks, competitor } = input;
  const tracked = competitor.name;
  const name = competitor.label ?? competitor.name;
  const questions = questionTallies(checks, input.questions, tracked);
  // In a fixed order, so equal gaps always list the same AI first.
  const order = Object.keys(ASSISTANTS);
  const byProvider = [...groupBy(checks, (c) => c.provider)].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  const assistants = byProvider.map(([provider, group]) => ({
    provider,
    assistant: ASSISTANTS[provider] ?? provider,
    ...tally(group, tracked),
  }));
  const site = theirSite(checks, name, competitor.domain);
  const web = websiteFacts(checks, { name, site }, { domain: input.you.domain, blocked: input.you.websiteBlocked });
  const google = googleFacts(name, input.google?.theirs ?? null, input.google?.yours ?? null);
  const won = questionsTheyWin(questions);
  const onSite = input.you.site ? websiteChecks(input.theirWebsite ?? null, input.you.site, won) : { behind: [], ahead: [] };

  const questionsYouWin = questions.filter((q) => gap(q) < 0).sort(byGap);
  const assistantsYouWin = assistants.filter((a) => gap(a) < 0).sort(byGap);
  const youLead: Fact[] = [
    ...(questionsYouWin.length > 0
      ? [
          {
            title: "You win more questions",
            detail: `${questionsYouWin.length} of ${questions.length} questions`,
            text: `AI named you more often than ${name} on ${questionsYouWin.length} of ${questions.length} questions.`,
            where: null,
            weight: 5,
          },
        ]
      : []),
    ...assistantsYouWin.slice(0, 1).map((a) => ({
      title: `${a.assistant} prefers you`,
      detail: `${of(a, a.you)} answers vs their ${a.them}`,
      text: `${a.assistant} named you in ${of(a, a.you)} answers, and ${name} in ${a.them}.`,
      where: null,
      weight: gap(a) * -1,
    })),
    ...web.ahead,
    ...google.ahead,
    ...onSite.ahead,
  ];

  // Every reason and lead, strongest first: the panel shows the top few, the comparison page all of them.
  const allReasons = [
    ...web.behind,
    ...siteFacts(checks, tracked, name),
    ...google.behind,
    ...(input.you.site ? websiteGaps(name, input.theirWebsite ?? null, input.you.site, won) : []),
    ...onSite.behind,
  ].sort((a, b) => b.weight - a.weight);
  const allLeads = [...youLead].sort((a, b) => b.weight - a.weight);
  const sources = sourceBreakdown(checks, tracked, input.you.domain, site);
  const count = (key: SourceRow["key"]) => sources.find((r) => r.key === key)?.answers ?? 0;
  const theirs = input.theirWebsite;
  const yours = input.you.site;
  const bothRead = theirs?.status === "read" && theirs.signals && yours?.read && yours.signals;
  const areas: Area[] = [
    listingsArea(sources),
    quotesArea(count("their_site"), count("your_site"), site, !!input.you.domain),
    websiteArea(
      bothRead
        ? {
            theirs: theirs.signals!,
            yours: yours.signals!,
            servicesOnlyThem: serviceGaps(theirs, yours).length,
            claimsOnlyThem: (theirs.claims ?? []).filter((c) => !(yours.claims ?? []).some((y) => y.key === c.key)).length,
          }
        : null,
    ),
  ];

  return {
    name,
    site,
    sources,
    areas,
    theirPages: pagesUsed(checks, site),
    yourPages: pagesUsed(checks, input.you.domain ? hostOf(input.you.domain) : null),
    ...tally(checks, tracked),
    questionsTheyWin: won,
    questionsYouWin,
    assistantsTheyWin: assistants.filter((a) => gap(a) > 0).sort(byGap),
    assistants,
    reasons: allReasons.slice(0, MAX_REASONS),
    youLead: allLeads.slice(0, MAX_LEADS),
    allReasons,
    allLeads,
  };
}

/** "On "best tire shop in Dallas", AI named Bean House in 5 of 6 answers and you in 0." */
export function questionLine(q: QuestionTally, name: string): string {
  return `On "${q.question}", AI named ${name} in ${of(q, q.them)} answers and you in ${q.you}.`;
}

/** "ChatGPT named Bean House in 7 of 10 answers, and you in 2." */
export function assistantLine(a: AssistantTally, name: string): string {
  return `${a.assistant} named ${name} in ${of(a, a.them)} answers, and you in ${a.you}.`;
}
