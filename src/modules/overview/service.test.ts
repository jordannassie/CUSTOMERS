import { describe, expect, it } from "vitest";
import type { ScoreReport } from "@/modules/scanning";
import {
  changeText,
  overviewView,
  ownQuestionsText,
  scanFailuresFrom,
  scanSkipsFrom,
  scoreSentence,
  scoreTone,
  topOpportunities,
  type Opportunity, ownChainText } from "./service";

const estimate = (score: number) => ({ score, margin: 9.6, checks: 36, uniqueAnswers: 36 });

function report(overrides: Partial<ScoreReport> = {}): ScoreReport {
  return {
    overall: { ...estimate(61.7), confidence: "early" },
    byModel: [
      { model: "openai", estimate: estimate(75) },
      { model: "perplexity", estimate: estimate(48.4) },
    ],
    models: ["openai", "anthropic", "perplexity"],
    trend: [
      { date: "2026-09-26", score: null, checks: 0 },
      { date: "2026-09-27", score: 61.7, checks: 36 },
    ],
    history: [],
    change: null,
    monthChange: null,
    modelChanges: {},
    firstCheckedAt: new Date("2026-09-20T10:00:00Z"),
    lastCheckedAt: new Date("2026-09-27T10:00:00Z"),
    competitors: [],
    questions: [],
    ownQuestions: null,
    ownChain: null,
    ...overrides,
  };
}

const opp = (id: string, impact: Opportunity["impact"], createdAt: string): Opportunity => ({
  id,
  title: `Fix ${id}`,
  impact,
  createdAt,
});

describe("scoreSentence", () => {
  it.each([
    [62, "AI recommended you in about 6 of 10 customer questions this month."],
    [96, "AI recommended you in about 10 of 10 customer questions this month."],
    [3, "AI recommended you in fewer than 1 of 10 customer questions this month."],
    [0, "AI did not recommend you in any customer questions this month."],
  ])("%s", (score, sentence) => {
    expect(scoreSentence(score)).toBe(sentence);
  });
});

describe("scoreTone", () => {
  it("uses the DESIGN.md bands", () => {
    expect([scoreTone(70), scoreTone(69.6), scoreTone(40), scoreTone(39.9)]).toEqual(["good", "mid", "mid", "low"]);
  });
});

describe("changeText", () => {
  it("says up or down and the rounded points", () => {
    expect(changeText({ direction: "up", points: 12.4 })).toBe("Up 12 points on last week");
    expect(changeText({ direction: "down", points: 1.2 })).toBe("Down 1 point on last week");
  });
});

describe("topOpportunities", () => {
  it("puts high impact first, then the newest, and keeps three", () => {
    const list = [
      opp("a", "low", "2026-09-27"),
      opp("b", "high", "2026-09-01"),
      opp("c", "medium", "2026-09-20"),
      opp("d", "high", "2026-09-10"),
    ];
    expect(topOpportunities(list).map((o) => o.id)).toEqual(["d", "b", "c"]);
  });
});

describe("overviewView", () => {
  it("builds one number, one label and one sentence from the report", () => {
    const view = overviewView(report(), []);
    expect(view.score).toMatchObject({
      value: 62,
      tone: "mid",
      label: "Early estimate",
      sentence: "AI recommended you in about 6 of 10 customer questions this month.",
      firstResults: true,
      change: null,
    });
    expect(view.score?.details.accuracy.margin).toBe("Give or take 10 points");
    expect(view.score?.details.calibration).toBeNull();
  });

  it("lists every chosen model, with no score for one that has no checks yet", () => {
    expect(overviewView(report(), []).models).toEqual([
      { id: "openai", label: "ChatGPT", score: 75, notChecked: false, skipped: false, change: null, monthChange: null },
      { id: "anthropic", label: "Claude", score: null, notChecked: false, skipped: false, change: null, monthChange: null },
      { id: "perplexity", label: "Perplexity", score: 48, notChecked: false, skipped: false, change: null, monthChange: null },
    ]);
  });

  it("gives each AI tool its change on the 30 days before too, for the monthly report", () => {
    const view = overviewView(report({ modelMonthChanges: { openai: { direction: "up", points: 8.4 } } }), []);
    expect(view.models.find((m) => m.id === "openai")).toMatchObject({ change: null, monthChange: { direction: "up", points: 8 } });
  });

  describe("an AI that couldn't be checked (BUG-074)", () => {
    const twelve: ScoreReport["questions"] = Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, question: `Question ${i}`, appeared: 0, checks: 3 }));

    it("says Claude couldn't be checked when it has no checks and failed in the last scan", () => {
      const view = overviewView(report({ questions: twelve }), [], { lastScanFailures: { anthropic: 12 } });
      expect(view.models.find((m) => m.id === "anthropic")).toMatchObject({ score: null, notChecked: true });
      expect(view.score?.coverage).toBe("Based on ChatGPT and Perplexity. Claude couldn't be checked.");
      expect(view.score?.details.models).toContainEqual({ id: "anthropic", label: "Claude", score: null, value: "Not checked" });
      expect(view.scanNotice).toBe(
        "In the last scan, Claude couldn't be checked. We'll try again in the next scan. Failed checks are never charged.",
      );
    });

    it("says Claude couldn't be checked when one cached answer is all it has and the rest of the scan failed", () => {
      const one = { score: 0, margin: 60, checks: 1, uniqueAnswers: 1 };
      const withOne = report({ questions: twelve, byModel: [...report().byModel, { model: "anthropic", estimate: one }] });
      const view = overviewView(withOne, [], { lastScanFailures: { anthropic: 11 } });
      expect(view.models.find((m) => m.id === "anthropic")).toMatchObject({ score: null, notChecked: true });
      // With enough answers, or when the scan did not mostly fail, the number stands.
      const healthy = overviewView(withOne, [], { lastScanFailures: { anthropic: 1 } });
      expect(healthy.models.find((m) => m.id === "anthropic")).toMatchObject({ score: 0, notChecked: false });
    });

    it("says an AI simply has no checks yet when nothing failed", () => {
      const view = overviewView(report(), []);
      expect(view.score?.coverage).toBe("Based on ChatGPT and Perplexity. Claude has no checks yet.");
      expect(view.scanNotice).toBeNull();
    });

    it("keeps an older score and only notes a partly failed scan", () => {
      const view = overviewView(report({ questions: twelve }), [], { lastScanFailures: { openai: 1 } });
      expect(view.models.find((m) => m.id === "openai")).toMatchObject({ score: 75, notChecked: false });
      expect(view.scanNotice).toBe(
        "In the last scan, ChatGPT couldn't answer some questions. We'll try again in the next scan. Failed checks are never charged.",
      );
    });

    it("has no coverage line when every chosen AI has a score", () => {
      const all = report({ byModel: [...report().byModel, { model: "anthropic", estimate: estimate(20) }] });
      expect(overviewView(all, []).score?.coverage).toBeNull();
    });

    it("says Claude was skipped, not that it couldn't be checked, when the scan left it out", () => {
      const view = overviewView(report({ questions: twelve }), [], { lastScanFailures: { anthropic: 12 }, lastScanSkipped: ["anthropic"] });
      expect(view.models.find((m) => m.id === "anthropic")).toMatchObject({ score: null, skipped: true });
      expect(view.score?.coverage).toBe("Based on ChatGPT and Perplexity. Claude was skipped because it's unavailable.");
      expect(view.score?.details.models).toContainEqual({ id: "anthropic", label: "Claude", score: null, value: "Skipped" });
      expect(view.scanNotice).toBe("In the last scan, Claude was skipped because it's unavailable. Skipped checks use no credits.");
    });

    it("names a skipped AI and a failing one apart", () => {
      const view = overviewView(report({ questions: twelve }), [], { lastScanFailures: { anthropic: 12, openai: 2 }, lastScanSkipped: ["anthropic"] });
      expect(view.scanNotice).toBe(
        "In the last scan, Claude was skipped because it's unavailable, and ChatGPT couldn't answer some questions. We'll try again in the next scan. Failed checks are never charged.",
      );
    });

    it("reads skipped checks from the run row", () => {
      const row = { anthropic: { failed: 2, skipped: 10, reason: "Claude unavailable, skipped" }, openai: { failed: 0 } };
      expect(scanFailuresFrom(row)).toEqual({ anthropic: 12 });
      expect(scanSkipsFrom(row)).toEqual(["anthropic"]);
      expect(scanSkipsFrom({ anthropic: { failed: 12 } })).toEqual([]);
      expect(scanSkipsFrom(null)).toEqual([]);
    });

    it("reads failed counts from the run row", () => {
      expect(scanFailuresFrom({ anthropic: { failed: 12, reason: "x" }, openai: { failed: 0 } })).toEqual({ anthropic: 12 });
      expect(scanFailuresFrom(null)).toBeNull();
    });
  });

  it("gives a model its weekly change rounded, and none under a point (DB-013)", () => {
    const view = overviewView(
      report({ modelChanges: { openai: { direction: "down", points: 6.4 }, perplexity: { direction: "up", points: 0.3 } } }),
      [],
    );
    expect(view.models.map((m) => m.change)).toEqual([{ direction: "down", points: 6 }, null, null]);
  });

  it("stops calling it first results after a second day of scans", () => {
    const trend = [
      { date: "2026-09-26", score: 50, checks: 36 },
      { date: "2026-09-27", score: 61.7, checks: 36 },
    ];
    expect(overviewView(report({ trend }), []).score?.firstResults).toBe(false);
  });

  it("shows the change only when the report found a real one", () => {
    const view = overviewView(report({ change: { direction: "down", points: 18.2 } }), []);
    expect(view.score?.change).toEqual({ direction: "down", text: "Down 18 points on last week" });
  });

  it("shows the user's own questions apart from the score, only when they have answers (BUG-129)", () => {
    expect(overviewView(report(), []).ownQuestions).toBeNull();
    expect(overviewView(report({ ownQuestions: { named: 3, answers: 9 } }), []).ownQuestions).toBe(
      "Your own questions: named in 3 of 9 answers. Not part of the score.",
    );
    expect(ownQuestionsText({ named: 0, answers: 1 })).toBe("Your own questions: named in 0 of 1 answer. Not part of the score.");
  });

  it("says the score covers suggested questions only (BUG-129)", () => {
    const details = overviewView(report(), []).score!.details;
    expect(details.steps).toContainEqual({ icon: "questions", title: "Suggested questions only", detail: "Questions you add yourself are tracked on their own." });
    expect(details.numbers).toContainEqual(expect.objectContaining({ label: "Answers checked", hint: "Answers to suggested questions only." }));
  });

  it("has no score before the first scan", () => {
    const view = overviewView(report({ overall: null, byModel: [], trend: [], lastCheckedAt: null }), []);
    expect(view.score).toBeNull();
    expect(view.lastCheckedAt).toBeNull();
    expect(view.models.every((m) => m.score === null)).toBe(true);
  });
});

describe("ownChainText (step 7)", () => {
  it("shows a branch business's chain mentions apart from its score", () => {
    expect(ownChainText({ brand: "Bennu Coffee", named: 2, answers: 3 })).toBe(
      "Bennu Coffee (all locations): named in 2 of 3 answers. Your score counts only the answers that name your location.",
    );
    expect(ownChainText({ brand: "Bennu Coffee", named: 0, answers: 3 })).toBeNull();
    expect(ownChainText(null)).toBeNull();
  });
});
