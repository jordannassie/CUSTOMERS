// The fit check for "Other" businesses (question-fit.v1, 2026-10-16): misfits are replaced, at most two fit calls,
// and a failed call leaves the written questions as they are. Fake clients only; no model is called.
import { describe, expect, it, vi } from "vitest";
import type { Intent } from "@/modules/question-library";
import { describeFit, fitOtherQuestions, type FitDeps } from "./other-fit";
import { fitRequest, fitVerdicts, type CheckFit, type QuestionModel } from "./question-model";
import { fallbackQuestions, type PreparedQuestion } from "./question-rules";
import { prepareQuestions, type QuestionBusiness } from "./questions";
import { FIT_MODEL, MAX_FIT_ROUNDS } from "./prompts/question-fit.v1";

const q = (text: string, intent: Intent): PreparedQuestion => ({ text, intent, templateId: null });

const STORE: QuestionBusiness = {
  industry: "Sportswear store",
  industryText: "Sportswear store",
  services: ["running shoes", "team kits"],
  description: "Sportswear and running shoes for clubs and runners.",
  city: "Austin",
  region: "TX",
};

// What the writer gave a sportswear store: three of them ask for a gym, not a shop.
const FIRST: PreparedQuestion[] = [
  q("What is the best sportswear store in Austin, TX?", "best"),
  q("Which sportswear store in Austin, TX has the widest range of running shoes?", "best"),
  q("Which gym in Austin, TX has the best personal trainers?", "best"),
  q("Where should I buy football boots in Austin, TX?", "best"),
  q("Which sportswear store in Austin, TX has the best reviews?", "reviews"),
  q("Which yoga studio in Austin, TX do locals recommend?", "reviews"),
  q("What is the most trusted sports shop in Austin, TX?", "reviews"),
  q("Which sportswear store in Austin, TX has fair prices on team kits?", "price"),
  q("What is the cheapest gym membership in Austin, TX?", "price"),
  q("Which sports shop in Austin, TX is better for a beginner runner?", "comparison"),
  q("Which sportswear store in Austin, TX can print a team kit quickly?", "urgent"),
  q("I need running shoes for a race next week. Which store in Austin, TX should I try?", "urgent"),
];
const GYM = /\bgym\b|yoga|trainer/i;
const MORE: PreparedQuestion[] = [
  q("Which store in Austin, TX sells the best trail running shoes?", "best"),
  q("Which sports shop in Austin, TX gives honest advice on running shoes?", "reviews"),
  q("Where can I find affordable sportswear in Austin, TX?", "price"),
];
const MORE_GYMS = [q("Which gym in Austin, TX is best for weight training?", "comparison"), q("Which gym in Austin, TX has a running club?", "best")];
const PLAIN = fallbackQuestions("sportswear store", "Austin", "TX");

/** A check that says no to anything about a gym, recording what it was sent. */
function gymCheck(fail?: (call: number) => boolean) {
  const sent: string[][] = [];
  const check: CheckFit = async ({ questions }) => {
    sent.push(questions);
    if (fail?.(sent.length)) throw new Error("529 overloaded");
    return questions.map((x) => !GYM.test(x));
  };
  return { check, sent };
}

function deps(check: CheckFit, overrides: Partial<FitDeps> = {}) {
  const writeMore = vi.fn(async () => MORE);
  return {
    writeMore,
    deps: { check, business: { type: "sportswear store", services: STORE.services, city: "Austin, TX" }, writeMore, plain: PLAIN, services: STORE.services, ...overrides },
  };
}

describe("fitOtherQuestions", () => {
  it("keeps a set that fits, after one call and no new writing", async () => {
    const { check, sent } = gymCheck();
    const fitting = FIRST.filter((x) => !GYM.test(x.text));
    const { deps: d, writeMore } = deps(check);
    const { questions, report } = await fitOtherQuestions(fitting, d);
    expect(questions).toEqual(fitting);
    expect(sent).toHaveLength(1);
    expect(writeMore).not.toHaveBeenCalled();
    expect(report).toMatchObject({ rounds: 1, checked: fitting.length, rejected: [], replaced: 0, error: null });
  });

  it("replaces the misfits with new questions and checks only the new ones the second time", async () => {
    const { check, sent } = gymCheck();
    const { deps: d, writeMore } = deps(check);
    const { questions, report } = await fitOtherQuestions(FIRST, d);
    expect(questions).toHaveLength(FIRST.length);
    expect(questions.some((x) => GYM.test(x.text))).toBe(false);
    expect(writeMore).toHaveBeenCalledTimes(1);
    expect(sent[0]).toHaveLength(12);
    // Round two sees only what was added, never the nine that already passed.
    expect(sent[1].every((x) => !FIRST.some((f) => f.text === x))).toBe(true);
    expect(report.rejected).toEqual(FIRST.filter((x) => GYM.test(x.text)).map((x) => x.text));
    expect(report.replaced).toBe(3);
    expect(report.rounds).toBe(2);
  });

  it("never makes more than two fit calls; misfits after the last one become plain questions", async () => {
    // The new batch has gym questions again, and the check says no to them every time.
    const { check, sent } = gymCheck();
    const { deps: d, writeMore } = deps(check, { writeMore: vi.fn(async () => [...MORE_GYMS, ...MORE]) });
    const { questions, report } = await fitOtherQuestions(FIRST, d);
    expect(sent.length).toBeLessThanOrEqual(MAX_FIT_ROUNDS);
    expect(d.writeMore).toHaveBeenCalledTimes(1);
    expect(writeMore).not.toHaveBeenCalled();
    expect(questions).toHaveLength(12);
    expect(questions.some((x) => GYM.test(x.text))).toBe(false);
    expect(sent).toHaveLength(2);
    expect(report.rejected.filter((x) => MORE_GYMS.some((g) => g.text === x)).length).toBeGreaterThan(0);
  });

  it("keeps the questions as written when the fit call fails", async () => {
    const { check } = gymCheck(() => true);
    const { deps: d, writeMore } = deps(check);
    const { questions, report } = await fitOtherQuestions(FIRST, d);
    expect(questions).toEqual(FIRST);
    expect(writeMore).not.toHaveBeenCalled();
    expect(report).toMatchObject({ rounds: 0, checked: 0, rejected: [], replaced: 0, error: "529 overloaded" });
  });

  it("keeps the first round's replacements when the second call fails", async () => {
    const { check } = gymCheck((call) => call === 2);
    const { deps: d } = deps(check);
    const { questions, report } = await fitOtherQuestions(FIRST, d);
    expect(questions).toHaveLength(12);
    expect(questions.some((x) => /yoga|trainer/i.test(x.text))).toBe(false);
    expect(report).toMatchObject({ rounds: 1, error: "529 overloaded" });
  });

  it("never leaves fewer questions than it was given: a misfit stays when nothing can take its place", async () => {
    const check: CheckFit = async ({ questions }) => questions.map(() => false);
    const { deps: d } = deps(check, { writeMore: async () => Promise.reject(new Error("down")), plain: [] });
    const { questions, report } = await fitOtherQuestions(FIRST, d);
    expect(questions).toHaveLength(FIRST.length);
    expect(report.keptAnyway).toBe(FIRST.length);
    expect(describeFit("sportswear store", report)).toMatch(/12 did not fit, 0 replaced, 12 kept with nothing to replace them/);
  });
});

describe("the fit call", () => {
  it("sends the kind of business, services, city and every question to Haiku in one request", () => {
    const req = fitRequest({ business: { type: "sportswear store", services: ["running shoes"], city: "Austin, TX" }, questions: ["A?", "B?"] });
    expect(req.model).toBe(FIT_MODEL);
    expect(req.user).toContain("Kind of business: sportswear store");
    expect(req.user).toContain("Services: running shoes");
    expect(req.user).toContain("City: Austin, TX");
    expect(req.user).toMatch(/1\. A\?\n2\. B\?/);
  });

  it("reads yes and no per number; a number left out counts as fitting", () => {
    expect(fitVerdicts({ answers: [{ number: 1, fits: "yes" }, { number: 2, fits: "no" }] }, 3)).toEqual([true, false, true]);
  });
});

describe("prepareQuestions with the fit check", () => {
  const written = FIRST.map((x) => ({ template: x.text.replaceAll("Austin, TX", "{city}"), intent: x.intent }));
  const more = MORE.map((x) => ({ template: x.text.replaceAll("Austin, TX", "{city}"), intent: x.intent }));

  function model(fit?: CheckFit) {
    let writes = 0;
    const m: QuestionModel = {
      pick: async () => [],
      write: async () => (writes++ === 0 ? written : more),
      ...(fit ? { fit } : {}),
    };
    return { loadLibrary: async () => [], model: m };
  }

  it("checks an Other business's written questions and replaces the misfits", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { check, sent } = gymCheck();
    const set = await prepareQuestions(STORE, model(check));
    expect(sent.length).toBeGreaterThan(0);
    expect(set.fit?.rejected.length).toBeGreaterThan(0);
    expect(set.questions.some((x) => GYM.test(x.text))).toBe(false);
    expect(set.questions.length).toBeGreaterThanOrEqual(12);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^Question fit \(question-fit\.v1\) for "Sportswear store"/));
    info.mockRestore();
  });

  it("leaves the questions as written when the check fails", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const without = await prepareQuestions(STORE, model());
    const failed = await prepareQuestions(STORE, model(gymCheck(() => true).check));
    expect(failed.questions).toEqual(without.questions);
    expect(failed.fit?.error).toBe("529 overloaded");
    info.mockRestore();
  });

  it("is not run for a library industry or a vague label", async () => {
    const fit = vi.fn<CheckFit>(async ({ questions }) => questions.map(() => true));
    await prepareQuestions({ ...STORE, industry: "Consultant", industryText: "Consultant" }, model(fit));
    expect(fit).not.toHaveBeenCalled();
  });
});
