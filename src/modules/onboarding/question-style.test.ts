import { describe, expect, it } from "vitest";
import { balancePicks } from "./question-rules";
import { openingOf, questionKey, tidyPlace } from "./question-style";
import type { Intent } from "@/modules/question-library";

// 2026-10-13 question review: the place as a person writes it, and twelve questions that do not all start alike.
describe("tidyPlace", () => {
  it("drops a long region a person would not type", () => {
    expect(tidyPlace("Which sportswear store in Islamabad, Islamabad Capital Territory has the best reviews?", "Islamabad", "Islamabad Capital Territory")).toBe(
      "Which sportswear store in Islamabad has the best reviews?",
    );
    expect(tidyPlace("Can you recommend a good pizza delivery spot in Rawalpindi, Punjab?", "Rawalpindi", "Punjab")).toBe(
      "Can you recommend a good pizza delivery spot in Rawalpindi?",
    );
  });

  it("keeps a short code that tells places apart, and leaves other text alone", () => {
    expect(tidyPlace("Who is the best plumber in Austin, TX?", "Austin", "TX")).toBe("Who is the best plumber in Austin, TX?");
    expect(tidyPlace("Best cafe in Lahore?", "Lahore", null)).toBe("Best cafe in Lahore?");
  });
});

describe("varied openings", () => {
  const q = (template: string, intent: Intent = "best") => ({ template, tags: [] as string[], intent });

  it("reads the first two words", () => {
    expect(openingOf("Where can I find a dentist?")).toBe("where can");
  });

  it("tops up with a new opening before a repeated one", () => {
    const pool = [
      ...["one", "two", "three", "four", "five"].map((n) => q(`Where can I find dentist ${n} in Austin?`, "best")),
      q("I just moved to Austin and need a dentist, who do you recommend?", "best"),
      q("Which dentist in Austin is best for kids?", "best"),
    ];
    const picked = balancePicks([], pool, []);
    const firstThree = picked.slice(0, 3).map((p) => openingOf(p.template));
    expect(new Set(firstThree).size).toBe(3);
  });
});

describe("written questions about a cuisine the business does not serve", () => {
  it("drops a broad cuisine, like the Asian question a pizza restaurant got", async () => {
    const { namesUnofferedTerm } = await import("./question-rules");
    expect(namesUnofferedTerm("I'm craving Asian cuisine and need a restaurant in Islamabad that won't cost too much?", ["pizza", "delivery", "pasta"], "Pizza restaurant.")).toBe(true);
    expect(namesUnofferedTerm("Looking for a restaurant in Islamabad that specializes in pasta?", ["pizza", "delivery", "pasta"], "Pizza restaurant.")).toBe(false);
  });
});

describe("questionKey", () => {
  it("is the same for one question worded another way", () => {
    expect(questionKey("What is the best coffee shop in Austin?")).toBe(questionKey("Which is the best coffee shop in Austin?"));
    expect(questionKey("Can you recommend a good dentist in Austin?")).toBe(questionKey("What's a good dentist in Austin?"));
  });

  it("differs when the question asks for something else", () => {
    expect(questionKey("Best coffee shop in Austin for studying?")).not.toBe(questionKey("Best coffee shop in Austin for brunch?"));
    expect(questionKey("Cheapest plumber in Austin?")).not.toBe(questionKey("Best plumber in Austin?"));
    expect(questionKey("Best plumber near Austin?")).not.toBe(questionKey("Best plumber in Austin?"));
  });
});

describe("balancePicks drops the same question worded another way (2026-10-14)", () => {
  const entry = (template: string, intent: Intent = "best") => ({ template, tags: ["general"], intent });

  it("keeps the first wording only", () => {
    const picked = balancePicks([entry("What is the best cafe in Austin?"), entry("Which is the best cafe in Austin?"), entry("Best cafe in Austin for studying?")], [], []);
    expect(picked.map((p) => p.template)).toEqual(["What is the best cafe in Austin?", "Best cafe in Austin for studying?"]);
  });
});

