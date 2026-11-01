import { describe, expect, it } from "vitest";
import { FLORIST_BUSINESS, FLORIST_WRITTEN, fakeQuestionClients } from "./question-fixtures";
import { domainLabel, namesOwnBusiness, withoutNames } from "./question-kind";
import { prepareQuestions } from "./questions";

describe("withoutNames", () => {
  it("takes the business's names out of the user's words for its trade", () => {
    expect(withoutNames("Cheezious pizza place", ["Cheezious Golra Mor Branch", "cheezious"])).toBe("pizza place");
    expect(withoutNames("BookWoman bookstore", ["Book Woman"])).toBe("bookstore");
    expect(withoutNames("Book Woman's bookstore", ["Book Woman"])).toBe("bookstore");
    expect(withoutNames("Florist", ["Orange Blossoms"])).toBe("Florist");
    expect(withoutNames("Cheezious", ["Cheezious"])).toBe("");
  });

  it("keeps trade words that are only part of a longer name", () => {
    expect(withoutNames("pizza restaurant", ["Pizza Hut"])).toBe("pizza restaurant");
  });

  it("reads the name a website spells", () => {
    expect(domainLabel("www.cheezious.com")).toBe("cheezious");
    expect(domainLabel("https://ebookwoman.com/about")).toBe("ebookwoman");
    expect(domainLabel(null)).toBeNull();
  });
});

describe("questions never carry the business's own name", () => {
  it("does not send the name to the writer, and drops a draft that names the business", async () => {
    const seen: string[] = [];
    const { clients } = fakeQuestionClients({
      write: [{ template: "Which Orange Blossoms shop in {city} does weddings?", intent: "best" }, ...FLORIST_WRITTEN],
    });
    const write = clients.model.write;
    clients.model.write = async (args) => (seen.push(args.business.industry), write(args));
    const set = await prepareQuestions(
      { ...FLORIST_BUSINESS, industryText: "Orange Blossoms florist", name: "Orange Blossoms", domain: "orangeblossoms.example" },
      clients,
    );
    expect(seen).toEqual(["florist"]);
    expect(set.source).toBe("written");
    expect(set.questions.some((q) => /orange blossoms/i.test(q.text))).toBe(false);
  });

  it("spots the name, an other name or the website's name as whole words", () => {
    const shop = { name: "Orange Blossoms", aliases: ["OB Flowers"], city: "Orange", domain: "orangeblossoms.example" };
    expect(namesOwnBusiness("Is Orange Blossoms the best florist in Orange?", shop)).toBe(true);
    expect(namesOwnBusiness("Does OB Flowers deliver in Orange?", shop)).toBe(true);
    expect(namesOwnBusiness("Is OrangeBlossoms open late?", shop)).toBe(true);
    expect(namesOwnBusiness("Which florist in Orange delivers?", shop)).toBe(false);
    expect(namesOwnBusiness("Which florist in Orange delivers?", { city: "Orange" })).toBe(false);
  });
});
