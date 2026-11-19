import { describe, expect, it } from "vitest";
import { momentumLine, questionsLine, sitesLine, themeRows } from "./summaries";

const q = (question: string, answers: number, them: number, you: number) => ({ questionId: question, question, answers, them, you });

describe("Compare tab headlines (2026-11-18)", () => {
  it("tallies the questions each of you wins", () => {
    expect(questionsLine([q("best espresso", 6, 6, 0), q("cheap coffee", 6, 5, 0), q("open early", 6, 0, 6), q("near me", 6, 3, 3)])).toBe(
      "They win 2 questions, you win 1, and 1 is about the same.",
    );
    expect(questionsLine([q("best espresso", 6, 6, 0)])).toBe("They win 1 question and you win 0.");
    expect(questionsLine([q("best espresso", 1, 1, 0)])).toBeNull();
  });
  it("groups the answers by kind of question, only when there are at least 2 kinds", () => {
    const rows = themeRows([q("best espresso in Austin", 6, 6, 0), q("cheap coffee near campus", 4, 3, 0), q("top coffee shop", 4, 4, 1)]);
    expect(rows?.map((r) => [r.label, r.questions, r.them, r.you, r.answers])).toEqual([
      ["Price", 1, 3, 0, 4],
      ["Quality", 2, 10, 1, 10],
    ]);
    expect(themeRows([q("best espresso", 6, 6, 0)])).toBeNull();
  });
  it("names the sites that favour them", () => {
    const d = (host: string, result: "they_win" | "you_win" | "tie" | "too_few") => ({ host, answers: 4, them: 3, you: 0, result });
    expect(sitesLine([d("yelp.com", "they_win"), d("a.com", "you_win")], "Bean House")).toBe("1 site named Bean House more than you: yelp.com.");
    expect(sitesLine([d("a.com", "they_win"), d("b.com", "they_win"), d("c.com", "they_win"), d("d.com", "they_win"), d("e.com", "they_win")], "Bean House")).toBe(
      "5 sites named Bean House more than you: a.com, b.com, c.com and 2 more.",
    );
    expect(sitesLine([d("a.com", "tie")], "Bean House")).toBeNull();
  });
  it("says how each of you moved, on the 30-day score where the chart has it", () => {
    const p = (label: string, them: number, you: number) => ({ label, you, them, youRolling: you, themRolling: them });
    expect(momentumLine([p("Nov 3", 20, 0), p("Nov 10", 30, 0), p("Nov 17", 38, 0)], "Bean House")).toBe(
      "Since Nov 3, Bean House's 30-day score went from 20% to 38%, and yours stayed at 0%.",
    );
    expect(momentumLine([p("Nov 3", 20, 0)], "Bean House")).toBeNull();
  });
});

describe("momentumLine without 30-day scores", () => {
  it("says nothing rather than mixing in single-scan shares", () => {
    const p = (label: string) => ({ label, you: 10, them: 20, youRolling: null, themRolling: null });
    expect(momentumLine([p("Nov 3"), p("Nov 10")], "Bean House")).toBeNull();
  });
});
