import { describe, expect, it } from "vitest";
import { plainAnswer } from "./answer-text";

describe("plainAnswer (admin answer dialog)", () => {
  it("turns a bold link into its words", () => {
    expect(plainAnswer("Try **[Hungry Ghost Bread](https://hungryghostbread.com/?utm_source=openai)** on Main St."))
      .toBe("Try Hungry Ghost Bread on Main St.");
  });

  it("keeps line breaks, bullets lists and drops headings and citation numbers", () => {
    const md = "## Top picks\n\n- **Joe's Coffee**: great espresso [1]\n* _Bean There_ (open late)\n\n\n\n1. First\n> quoted";
    expect(plainAnswer(md)).toBe("Top picks\n\n• Joe's Coffee: great espresso\n• Bean There (open late)\n\n1. First\nquoted");
  });

  it("leaves underscores and stars inside words alone", () => {
    expect(plainAnswer("snake_case_name and 5*3*2 stay")).toBe("snake_case_name and 5*3*2 stay");
  });

  it("flattens tables and code, and never adds markup", () => {
    const md = "| Name | City |\n|---|---|\n| Joe's | Austin |\n\n```\n<b>code</b>\n```\nUse `npm`.";
    expect(plainAnswer(md)).toBe("Name  |  City\nJoe's  |  Austin\n\n<b>code</b>\nUse npm.");
  });

  it("keeps a link's address when the link is bare", () => {
    expect(plainAnswer("See <https://example.com/menu> and ![photo](https://x.test/a.png)")).toBe("See https://example.com/menu and photo");
  });
});
