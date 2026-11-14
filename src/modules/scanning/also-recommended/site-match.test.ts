import { describe, expect, it } from "vitest";
import { citedHosts, siteForName } from "./site-match";

describe("citedHosts", () => {
  it("reads the hosts of cited sites, without www", () => {
    expect(citedHosts([{ url: "https://www.Barton-Bean.com/menu", title: "Menu" }, { url: "https://yelp.com/biz/x" }])).toEqual([
      "barton-bean.com",
      "yelp.com",
    ]);
  });

  it("skips what is not a list of addresses", () => {
    expect(citedHosts(null)).toEqual([]);
    expect(citedHosts([{ url: "not a url" }])).toEqual([]);
  });
});

describe("siteForName", () => {
  const hosts = ["yelp.com", "lonestarbrewbar.com", "barton-bean.com", "joe.com", "austin.eater.com", "brightsmileaustindental.com"];

  it("finds the site whose address spells the name", () => {
    expect(siteForName("Lone Star Brew Bar", hosts)).toBe("lonestarbrewbar.com");
    expect(siteForName("Barton Bean", hosts)).toBe("barton-bean.com");
  });

  it("takes a site named with the start of a longer business name, or a little more", () => {
    expect(siteForName("Barton Bean Coffee", hosts)).toBe("barton-bean.com");
    expect(siteForName("Bright Smile Austin", hosts)).toBe("brightsmileaustindental.com");
  });

  it("never guesses: short labels, directories and unrelated sites do not match", () => {
    expect(siteForName("Joe's Pizza Palace", hosts)).toBeNull();
    expect(siteForName("Eater Austin", hosts)).toBeNull();
    expect(siteForName("Congress Cup", hosts)).toBeNull();
    expect(siteForName("Joe", hosts)).toBeNull();
  });
});
