import { describe, expect, it } from "vitest";
import { capitalizeFirst, fixNameCase } from "./name-case";

describe("fixNameCase (BUG-078)", () => {
  it("puts AI brand names back after sentence case", () => {
    expect(fixNameCase("Ai almost never mentions you")).toBe("AI almost never mentions you");
    expect(fixNameCase("Chatgpt knows you less than perplexity does")).toBe("ChatGPT knows you less than Perplexity does");
    expect(fixNameCase("Add your hours to google so claude can find them")).toBe("Add your hours to Google so Claude can find them");
  });

  it("restores business names as written", () => {
    expect(fixNameCase("Gul ahmed is named more than khaadi", ["Khaadi", "Gul Ahmed"])).toBe("Gul Ahmed is named more than Khaadi");
  });

  it("starts a title with a capital letter", () => {
    expect(capitalizeFirst("your website is not cited")).toBe("Your website is not cited");
    expect(capitalizeFirst("")).toBe("");
  });

  it("leaves domains as they are", () => {
    expect(fixNameCase("No citations of khaadi.com or www.khaadi.com yet", ["Khaadi"])).toBe("No citations of khaadi.com or www.khaadi.com yet");
    expect(fixNameCase("khaadi is not cited.", ["Khaadi"])).toBe("Khaadi is not cited.");
  });

  it("leaves the letters inside other words alone", () => {
    expect(fixNameCase("Detail your services and repairs")).toBe("Detail your services and repairs");
    expect(fixNameCase("Googled it, then left")).toBe("Googled it, then left");
  });
});
