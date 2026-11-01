import { describe, expect, it } from "vitest";
import { COFFEE_SNAPSHOT, GOOD_COFFEE_WORDING } from "./fixtures";
import { snapshotNumbers } from "./input";
import { fixWordingIssues, numberIssues, promiseIssues, sentenceCount, siteIssues, wordingContext, writingIssues } from "./validate";

const ctx = wordingContext(COFFEE_SNAPSHOT);
const good = GOOD_COFFEE_WORDING.fixes[0];

describe("fix wording checks", () => {
  it("passes the hand-written good rewrite", () => {
    for (const w of GOOD_COFFEE_WORDING.fixes) expect(fixWordingIssues(w, ctx)).toEqual([]);
  });

  it("collects the report's numbers, 1 to 4, and nothing from the agency block", () => {
    const numbers = snapshotNumbers(COFFEE_SNAPSHOT);
    for (const n of ["15", "60", "9", "24", "40", "18", "11", "8", "1", "2", "3", "4"]) expect(numbers.has(n)).toBe(true);
    // 99 and 17 appear only in the agency's email and logo path.
    expect(numberIssues("Ask 99 customers, then 17 more.", ctx)).toEqual(["number not in the report: 99", "number not in the report: 17"]);
  });

  it("reads decimals, percents and thousands as numbers", () => {
    expect(numberIssues("You were named in 15% of answers, up 3 points.", ctx)).toEqual([]);
    expect(numberIssues("A 4.5 rating and 1,200 reviews.", ctx)).toEqual(["number not in the report: 4.5", "number not in the report: 1,200"]);
  });

  it("does not read digits inside a name or a website as numbers", () => {
    expect(numberIssues("Cafe 22 was not named at all.", ctx)).toEqual([]);
    expect(siteIssues("Check yelp.com and sunrise-coffee.example.", ctx)).toEqual([]);
    expect(siteIssues("Get listed on tripadvisor.com.", ctx)).toEqual(["website not in the report: tripadvisor.com"]);
  });

  it("applies the writing guide", () => {
    expect(writingIssues("Fill in your listing \u2013 today")).toEqual(["long dash"]);
    expect(writingIssues("Leverage your reviews to unlock more visits!")).toEqual([
      "exclamation mark",
      "banned word: unlock",
      "banned word: leverage",
    ]);
    expect(writingIssues("Add your menu \u2615")).toEqual(["emoji"]);
  });

  it("catches promised results but allows honest wording", () => {
    expect(promiseIssues("This will rank you #1 in ChatGPT.")).toEqual(["promises a result: will rank", "promises a result: #1"]);
    expect(promiseIssues("We guarantee more customers.")).toEqual(["promises a result: guarantee"]);
    expect(promiseIssues("This can help AI name you more often.")).toEqual([]);
  });

  it("counts sentences without splitting on a market or a website", () => {
    expect(sentenceCount("AI cited yelp.com in 11 answers. It named you in 1.", ctx)).toBe(2);
    const stLouis = wordingContext({ ...COFFEE_SNAPSHOT, business: { ...COFFEE_SNAPSHOT.business, market: "St. Louis, MO" } });
    expect(sentenceCount("People in St. Louis, MO ask AI for coffee.", stLouis)).toBe(1);
  });

  it("checks lengths, steps and title shape", () => {
    expect(fixWordingIssues({ ...good, title: "A".repeat(61) }, ctx)).toEqual(["title over 60 characters (61)"]);
    expect(fixWordingIssues({ ...good, title: "Fill in your listing." }, ctx)).toEqual(["title ends with a full stop or has a line break"]);
    expect(fixWordingIssues({ ...good, title: "Give AI Clear Answers On Your Website" }, ctx)).toEqual(["title is not in sentence case"]);
    expect(fixWordingIssues({ ...good, why: "One. Two. Three." }, ctx)).toEqual(["why has more than 2 sentences"]);
    expect(fixWordingIssues({ ...good, steps: ["Add a menu page."] }, ctx)).toEqual(["needs 2 to 4 steps, has 1"]);
    expect(fixWordingIssues({ ...good, steps: ["Add a menu page. Then add prices.", " "] }, ctx)).toEqual([
      "step 1 is more than one sentence",
      "step 2 is empty",
    ]);
    expect(fixWordingIssues({ ...good, why: " " }, ctx)).toEqual(["empty field"]);
  });

  it("keeps names in their own case in a sentence case title", () => {
    expect(fixWordingIssues({ ...good, title: "Show Sunrise Coffee Bar on Google Business Profile" }, ctx)).toEqual([]);
  });
});
