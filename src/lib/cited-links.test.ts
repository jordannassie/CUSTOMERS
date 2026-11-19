import { describe, expect, it } from "vitest";
import { isMapSearchLink, realCitations } from "./cited-links";

describe("isMapSearchLink", () => {
  it("catches the Maps search links ChatGPT builds from a business name", () => {
    expect(isMapSearchLink("https://www.google.com/maps/search/787+Coffee%2C+New+York%2C+NY?utm_source=openai")).toBe(true);
    expect(isMapSearchLink("https://google.co.uk/maps/search/?api=1&query=Joe+Coffee")).toBe(true);
    expect(isMapSearchLink("https://www.google.com/search?q=best+coffee+nyc")).toBe(true);
    expect(isMapSearchLink("https://maps.google.com/?q=La+Colombe")).toBe(true);
  });

  it("keeps real pages, including a Maps place page and other sites", () => {
    expect(isMapSearchLink("https://www.google.com/maps/place/Bean+House")).toBe(false);
    expect(isMapSearchLink("https://maps.google.com/?cid=123")).toBe(false);
    expect(isMapSearchLink("https://www.yelp.com/search?q=coffee")).toBe(false);
    expect(isMapSearchLink("https://googleblog.com/search/x")).toBe(false);
    expect(isMapSearchLink("not a url")).toBe(false);
  });
});

describe("realCitations", () => {
  it("drops built search links and keeps the rest in order", () => {
    const cited = [
      { url: "https://www.timeout.com/newyork/coffee", title: "Time Out" },
      { url: "https://www.google.com/maps/search/787+Coffee" },
      { url: "https://www.yelp.com/biz/787-coffee" },
    ];
    expect(realCitations(cited)).toEqual([cited[0], cited[2]]);
  });

  it("leaves values that are not lists alone", () => {
    expect(realCitations(null)).toBeNull();
    expect(realCitations("x")).toBe("x");
  });
});
