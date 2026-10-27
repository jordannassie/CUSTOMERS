import { describe, expect, it } from "vitest";
import type { LeaderRow } from "@/modules/competitors";
import type { OverviewView } from "@/modules/overview";
import type { StandingCheck } from "@/modules/standing";
import { buildDocument, competitorsHeadline, modelsHeadline, questionsHeadline, rankOf, summaryHeadline, type DocumentInput } from "./build";
import type { CompetitorLine, ModelLine } from "./document";

const NOW = new Date("2026-10-27T12:00:00Z");

const row = (name: string, score: number | null, extra: Partial<LeaderRow> = {}): LeaderRow => ({
  name,
  isYou: false,
  score,
  standing: null,
  collecting: false,
  change: null,
  shade: null,
  ...extra,
});

const check = (questionId: string, youNamed: boolean, competitors: string[] = [], sites: string[] = [], provider = "openai"): StandingCheck => ({
  provider,
  questionId,
  youNamed,
  competitors,
  extracted: null,
  sites,
});

const model = (id: ModelLine["id"], label: string, score: number | null): ModelLine => ({ id, label, score, change: null });

const overview = {
  score: { value: 30, tone: "low", label: "Good confidence", sentence: "", firstResults: false, change: null, details: {} },
  models: [
    { ...model("openai", "ChatGPT", 0), margin: 5 },
    model("anthropic", "Claude", 40),
    model("perplexity", "Perplexity", 5),
  ],
  monthChange: null,
  lastCheckedAt: "2026-10-26T08:00:00Z",
} as unknown as OverviewView;

const leaderboard = [
  row("Pizza Hut", 38, { standing: "behind" }),
  row("Cheezious", 30, { isYou: true }),
  row("Dampukh", 0, { standing: "ahead" }),
  row("New Place", 12, { collecting: true }),
];

function input(extra: Partial<DocumentInput> = {}): DocumentInput {
  return {
    business: { name: "Cheezious", domain: "cheezious.com", place: "Rawalpindi", paused: false },
    now: NOW,
    windowDays: 30,
    overview,
    competitors: { leaderboard },
    checks: [
      check("q1", true, [], ["cheezious.com", "google.com"]),
      check("q1", false, ["Pizza Hut"], ["google.com"]),
      check("q2", false, ["Pizza Hut"], ["tripadvisor.com"], "anthropic"),
    ],
    questions: [
      { id: "q1", prompt: "Best pizza in Rawalpindi?", cells: [{ named: 0, checked: 3, change: null }, { named: 1, checked: 3, change: "up" }] },
      { id: "q2", prompt: "Cheap pizza delivery?", cells: [null, { named: 0, checked: 3, change: "same" }, null] },
      { id: "q3", prompt: "Pizza open late?", cells: [] },
    ],
    reasons: new Map([["Pizza Hut", "AI used google.com when it picked them"]]),
    reason: "A likely reason Pizza Hut is ahead of you: AI used google.com in 2 answers.",
    fixes: [
      { title: "Claim your Tripadvisor listing", impact: "medium", status: "todo", category: "citations", claude_prompt: null, where_to_apply: "tripadvisor.com", evidence: "Used in 6 answers.", description: null, affected_url: null, created_at: "2026-10-20" },
      { title: "Fill in your Google listing", impact: "high", status: "open", category: "local_presence", claude_prompt: null, where_to_apply: null, evidence: "Rated {business.rating} on Google.", description: "Customers check it.", affected_url: null, created_at: "2026-10-21" },
      { title: "Old fix", impact: "high", status: "resolved", category: "content", claude_prompt: null, where_to_apply: null, evidence: null, description: null, affected_url: null, created_at: "2026-10-22" },
      { title: "Hours on your site", impact: "low", status: "dismissed", category: "content", claude_prompt: null, where_to_apply: null, evidence: null, description: null, affected_url: null, created_at: "2026-10-22" },
    ],
    ...extra,
  };
}

describe("rankOf", () => {
  it("places you among tracked businesses with a full-window score, never a rank in AI (D-63)", () => {
    expect(rankOf(leaderboard)).toEqual({ position: 2, total: 3, leader: { name: "Pizza Hut", score: 38 } });
  });

  it("has no leader when you are first, and nothing before a score", () => {
    expect(rankOf([row("You", 50, { isYou: true }), row("B", 50)])).toEqual({ position: 1, total: 2, leader: null });
    expect(rankOf([row("You", null, { isYou: true }), row("B", 50)])).toBeNull();
  });

  it("names a chain row by the chain", () => {
    const chain = row("Bennu on Congress", 60, { chain: { brand: "Bennu Coffee", tracked: ["Bennu on Congress"] } });
    expect(rankOf([chain, row("You", 20, { isYou: true })])?.leader).toEqual({ name: "Bennu Coffee", score: 60 });
  });
});

describe("headlines", () => {
  it("say the score in plain words", () => {
    expect(summaryHeadline("Cheezious", 15)).toBe("AI recommends Cheezious in about 2 of 10 customer questions");
    expect(summaryHeadline("Cheezious", 3)).toBe("AI recommends Cheezious in fewer than 1 of 10 customer questions");
    expect(summaryHeadline("Cheezious", 0)).toBe("AI did not recommend Cheezious in any customer questions");
    expect(summaryHeadline("Cheezious", null)).toBe("No score yet for Cheezious");
  });

  it("name the AI tools that recommend you most and least", () => {
    expect(modelsHeadline([model("openai", "ChatGPT", 0), model("anthropic", "Claude", 40)])).toBe("Claude recommends you most, ChatGPT did not at all");
    expect(modelsHeadline([model("openai", "ChatGPT", 20), model("anthropic", "Claude", 40)])).toBe("Claude recommends you most, ChatGPT least");
    expect(modelsHeadline([model("openai", "ChatGPT", 35), model("anthropic", "Claude", 40)])).toBe("Each AI tool recommends you about as often");
    expect(modelsHeadline([model("openai", "ChatGPT", null)])).toBe("No AI tool has a score yet");
  });

  it("use the shared standing for competitors", () => {
    const line = (name: string, standing: CompetitorLine["standing"]): CompetitorLine => ({ name, isYou: false, score: 1, share: 1, standing, collecting: false, reason: null });
    expect(competitorsHeadline([line("A", "behind"), line("B", "behind"), line("C", "about_same")])).toBe("A and B are recommended more often");
    expect(competitorsHeadline([line("A", "about_same")])).toBe("No competitor is clearly ahead of you");
    expect(competitorsHeadline([line("A", "ahead")])).toBe("You are recommended more often than every tracked competitor");
    expect(competitorsHeadline([line("A", null)])).toBe("Not enough answers yet to compare");
    expect(competitorsHeadline([])).toBe("No competitors tracked yet");
  });

  it("count the questions that named you", () => {
    expect(questionsHeadline([{ question: "a", named: 1, answers: 3, trend: null }, { question: "b", named: 0, answers: 3, trend: null }])).toBe(
      "Recommended in 1 of 2 questions",
    );
    expect(questionsHeadline([{ question: "a", named: 0, answers: 0, trend: null }])).toBe("No answers yet");
  });
});

describe("buildDocument", () => {
  const doc = buildDocument(input());

  it("holds the summary facts and the plain paragraph", () => {
    expect(doc.summary.score).toEqual({ value: 30, label: "Good confidence", tone: "low" });
    expect(doc.summary.rank).toEqual({ position: 2, total: 3, leader: { name: "Pizza Hut", score: 38 } });
    expect(doc.summary.citations).toEqual({ cited: 1, answers: 3, hasSite: true });
    expect(doc.summary.lines.join(" ")).toContain("A likely reason Pizza Hut is ahead of you");
    expect(doc.summary.lines.at(-1)).toBe("First fix: Fill in your Google listing.");
  });

  it("keeps only the model fields the page shows", () => {
    expect(doc.models.rows[0]).toEqual({ id: "openai", label: "ChatGPT", score: 0, change: null });
  });

  it("gives each competitor its share of AI picks, status and main reason", () => {
    const [hut, you, dampukh, fresh] = doc.competitors.rows;
    expect(hut).toEqual({ name: "Pizza Hut", isYou: false, score: 38, share: 67, standing: "behind", collecting: false, reason: "AI used google.com when it picked them" });
    expect(you).toMatchObject({ isYou: true, share: 33, reason: null });
    expect(dampukh).toMatchObject({ share: 0, standing: "ahead", reason: null });
    // Still collecting: no share or standing until it covers the whole window.
    expect(fresh).toMatchObject({ share: null, standing: null, collecting: true });
    expect(doc.competitors.hasReasons).toBe(true);
  });

  it("counts named answers per suggested question with the latest trend", () => {
    expect(doc.questions.rows).toEqual([
      { question: "Best pizza in Rawalpindi?", named: 1, answers: 2, trend: "up" },
      { question: "Cheap pizza delivery?", named: 0, answers: 1, trend: "same" },
      { question: "Pizza open late?", named: 0, answers: 0, trend: null },
    ]);
    expect(doc.questionCount).toBe(3);
  });

  it("lists the sites AI used and whether those answers named you", () => {
    expect(doc.sources.rows).toEqual([
      { host: "google.com", answers: 2, namedYou: 1, own: false },
      { host: "cheezious.com", answers: 1, namedYou: 1, own: true },
      { host: "tripadvisor.com", answers: 1, namedYou: 0, own: false },
    ]);
  });

  it("plans only open fixes, most important first, and never shows a Google value (D-73)", () => {
    expect(doc.actions.rows).toEqual([
      { title: "Fill in your Google listing", impact: "high", where: "Google Business Profile", why: "Customers check it." },
      { title: "Claim your Tripadvisor listing", impact: "medium", where: "tripadvisor.com", why: "Used in 6 answers." },
    ]);
    expect(JSON.stringify(doc)).not.toContain("{business.");
  });

  it("records the period and the paused state", () => {
    expect(doc.preparedAt).toBe(NOW.toISOString());
    expect(buildDocument(input({ business: { name: "X", domain: null, place: null, paused: true } }))).toMatchObject({
      paused: true,
      summary: { citations: { cited: 0, hasSite: false } },
    });
  });
});
