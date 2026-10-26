// Why AI names a competitor more or less than you (Phase A of the "why you are behind" plan). Pure, over answers the
// scans already saved: where they beat you (questions, AI tools), likely reasons with where to fix them, and where
// you lead. Ahead or behind itself is the leaderboard's call (scoring.ts compareWithCompetitor), never made here.
import { namedIn, type StandingCheck } from "./checks";
import { googleFacts, siteFacts, theirSite, websiteFacts, type Fact, type GoogleValues } from "./reasons";

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
};

export type WhyInput = {
  /** Answers that count in the score (scores/counted.ts), in the 30-day window, for the business's AI tools. */
  checks: StandingCheck[];
  /** Question id to its wording now. */
  questions: Map<string, string>;
  you: { domain: string | null; websiteBlocked: boolean };
  /** name: the tracked name the saved answers are counted under. label: the name AI used, for a chain's branch the
   * chain ("Bennu Coffee" for "Bennu Coffee on Congress"); every sentence and site match uses it. */
  competitor: { name: string; domain: string | null; label?: string };
  /** Live Google values for this page view, when the page has them (Competitors page only). */
  google?: { theirs: GoogleValues | null; yours: GoogleValues | null };
};

export const ASSISTANTS: Record<string, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
const MAX_REASONS = 3;
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
  ];

  return {
    name,
    site,
    ...tally(checks, tracked),
    questionsTheyWin: questions.filter((q) => gap(q) > 0).sort(byGap),
    questionsYouWin,
    assistantsTheyWin: assistants.filter((a) => gap(a) > 0).sort(byGap),
    assistants,
    reasons: [...web.behind, ...siteFacts(checks, tracked, name), ...google.behind].sort((a, b) => b.weight - a.weight).slice(0, MAX_REASONS),
    youLead: youLead.sort((a, b) => b.weight - a.weight).slice(0, MAX_LEADS),
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
