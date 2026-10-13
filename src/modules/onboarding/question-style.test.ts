import { describe, expect, it } from "vitest";
import { balancePicks } from "./question-rules";
import { openingOf, tidyPlace } from "./question-style";
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
