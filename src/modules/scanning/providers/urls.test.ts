import { describe, expect, it } from "vitest";
import { cleanUrl } from "./urls";

describe("cleanUrl", () => {
  it("drops OpenAI's utm_source tag so the same page matches across models", () => {
    expect(cleanUrl("https://www.timeout.com/newyork/coffee?utm_source=openai")).toBe("https://www.timeout.com/newyork/coffee");
  });

  it("drops a Maps search link the AI built from a business name: it is not a source", () => {
    expect(cleanUrl("https://www.google.com/maps/search/787+Coffee%2C+New+York?utm_source=openai")).toBeNull();
  });

  it("keeps a real Maps place page and refuses non-web links", () => {
    expect(cleanUrl("https://www.google.com/maps/place/Bean+House")).toBe("https://www.google.com/maps/place/Bean+House");
    expect(cleanUrl("mailto:hi@example.com")).toBeNull();
  });
});
