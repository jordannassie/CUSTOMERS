import { describe, expect, it } from "vitest";
import { closestAnswer, loadRecordedAnswers, recordedAnswers, type RecordedAnswer } from "./recorded";
import type { ProviderId } from "./providers/types";

const location = { city: "Orange", region: "CA", country: "US" };
const answers = await loadRecordedAnswers();

describe("recorded answers (B-31)", () => {
  it("has answers for every model, each with its business names labelled", () => {
    for (const provider of ["openai", "anthropic", "perplexity"] as ProviderId[]) {
      expect(answers.filter((a) => a.provider === provider).length).toBeGreaterThanOrEqual(12);
    }
    for (const a of answers) expect(a.names?.length).toBeGreaterThan(0);
  });

  it("picks the answer recorded for the same question and model", async () => {
    const { runCheck } = recordedAnswers(answers);
    const question = "What is the best coffee shop in Orange, CA?";
    for (const provider of ["openai", "anthropic", "perplexity"] as ProviderId[]) {
      const result = await runCheck(provider)({ question, location, model: "gpt-4.1-mini" });
      const expected = answers.find((a) => a.provider === provider && a.question === question)!;
      expect(result.answerText).toBe(expected.answerText);
      expect(result.costUsd).toBe(0);
    }
  });

  it("falls back to the closest question from the same model", () => {
    const pool = answers.filter((a) => a.provider === "anthropic");
    expect(closestAnswer(pool, "Which dentist in Austin, TX is good with nervous patients?").question).toBe(
      "Who is the best dentist in Austin, TX?",
    );
    expect(closestAnswer(pool, "what is THE best coffee shop in orange ca").question).toBe(
      "What is the best coffee shop in Orange, CA?",
    );
  });

  it("matches the trade before the city and question words (BUG-072)", () => {
    for (const provider of ["openai", "anthropic", "perplexity"] as ProviderId[]) {
      const pool = answers.filter((a) => a.provider === provider);
      const coffee = closestAnswer(pool, "Which coffee shop in Orange, CA has the best oat milk latte?").question.toLowerCase();
      expect(coffee).toMatch(/coffee|cafe/);
      // Real question from a test coffee shop that used to get an emergency dentist's answer.
      expect(closestAnswer(pool, "Where can I find an affordable cup of coffee in Austin, TX?").question.toLowerCase()).toMatch(/coffee|cafe/);
      expect(closestAnswer(pool, "Where can I get a cafe with fast wifi in Austin, TX?").question.toLowerCase()).toMatch(/coffee|cafe/);
      expect(closestAnswer(pool, "Which plumber in Orange, CA fixes water heaters?").question.toLowerCase()).toContain("plumber");
      expect(closestAnswer(pool, "Which dentist in Orange, CA takes walk-ins?").question.toLowerCase()).toContain("dentist");
    }
  });

  it("uses the business's industry when the question names no trade (BUG-072: cold brew got a dentist)", async () => {
    const question = "Where's the best place to get cold brew in North Loop, Austin, TX?";
    for (const provider of ["openai", "anthropic", "perplexity"] as ProviderId[]) {
      const { runCheck } = recordedAnswers(answers, "coffee_shop");
      const result = await runCheck(provider)({ question, location, model: "gpt-4.1-mini" });
      const used = answers.find((a) => a.provider === provider && a.answerText === result.answerText)!;
      expect(used.question.toLowerCase()).toMatch(/coffee|cafe/);
    }
  });

  it("returns the labelled names for a recorded answer", async () => {
    const answer = answers[0];
    const { extractNames } = recordedAnswers(answers);
    const extraction = await extractNames(answer.answerText);
    expect(extraction.names.map((n) => n.name)).toEqual(answer.names);
    expect(extraction.costUsd).toBe(0);
  });

  it("fails the check when a model has no recorded answers", async () => {
    const onlyOpenAI: RecordedAnswer[] = answers.filter((a) => a.provider === "openai");
    const { runCheck } = recordedAnswers(onlyOpenAI);
    await expect(runCheck("perplexity")({ question: "q", location, model: "perplexity/sonar" })).rejects.toThrow(
      "No recorded perplexity answers",
    );
  });
});
