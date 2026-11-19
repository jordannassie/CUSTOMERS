import { describe, expect, it } from "vitest";
import { followPages, menuLinks, servicesPage, sitePath } from "./site-pages";

describe("sitePath", () => {
  it("keeps links on the same site, with or without www, and drops the rest", () => {
    expect(sitePath("/services/", "example.com")).toBe("/services");
    expect(sitePath("https://www.example.com/menu#lunch", "example.com")).toBe("/menu");
    expect(sitePath("services", "www.example.com")).toBe("/services");
    for (const href of ["https://other.com/services", "#services", "mailto:hi@example.com", "tel:+15125550100", "/menu.pdf", "/", "javascript:void(0)"]) {
      expect(sitePath(href, "example.com")).toBeNull();
    }
  });
});

describe("servicesPage", () => {
  it("finds a linked services, menu or products page anywhere on the home page", () => {
    expect(servicesPage(`<footer><a href="/Menu/">Menu</a></footer>`, "cafe.example")).toBe("/menu");
    expect(servicesPage(`<a href="/our-services">What we do</a><a href="/products">Shop</a>`, "x.example")).toBe("/our-services");
    expect(servicesPage(`<a href="/services-areas">Areas</a><a href="https://other.com/services">x</a>`, "x.example")).toBeNull();
  });

  it("also takes a page named for its services, after the four usual addresses", () => {
    // magicplumbing.com's menu, in its order.
    const magic = ["/about-us/", "/about-us/financing/", "/join-our-team/", "/blog/", "/plumbing-services/", "/water-heaters/"]
      .map((p) => `<a href="https://www.magicplumbing.com${p}">x</a>`)
      .join("");
    expect(servicesPage(magic, "magicplumbing.com")).toBe("/plumbing-services");
    expect(servicesPage(`<a href="/food-menu">Food</a><a href="/menu">Menu</a>`, "x.example")).toBe("/menu");
    expect(servicesPage(`<a href="/careers/customer-services">Jobs</a>`, "x.example")).toBeNull();
  });
});

describe("menuLinks", () => {
  const html = `<a href="/promo">Promo</a><header><nav><a href="/">Home</a><a href="/about">About</a><a href="/login">Log in</a>
    <a href="/drains">Drains</a><a href="/drains">Drains</a><a href="https://facebook.com/x">FB</a><a href="/heaters">Heaters</a><a href="/jobs">Jobs</a></nav></header>`;

  it("takes the first links of the first menu in order, leaving out the home page, log in, about, jobs, other sites and repeats", () => {
    expect(menuLinks(html, "x.example")).toEqual(["/drains", "/heaters"]);
    expect(menuLinks(`<nav><a href="/team">T</a><a href="/a">A</a><a href="/b">B</a><a href="/c">C</a><a href="/d">D</a></nav>`, "x.example", ["/a"])).toEqual(["/b", "/c", "/d"]);
  });

  it("uses the header when there is no nav, and nothing when there is neither", () => {
    expect(menuLinks(`<header><a href="/a">A</a></header>`, "x.example")).toEqual(["/a"]);
    // A blog category is no offer page (epochcoffee.com).
    expect(menuLinks(`<nav><a href="/category/current-artists">Art</a><a href="/roasting-program">Roasting</a></nav>`, "x.example")).toEqual(["/roasting-program"]);
    expect(menuLinks(`<main><a href="/a">A</a></main>`, "x.example")).toEqual([]);
  });
});

describe("followPages", () => {
  it("reads the services page, then the fixed fallbacks, 5 pages in all with the home and about pages", () => {
    expect(followPages(`<nav><a href="/team">Team</a></nav><a href="/services">Services</a>`, "x.example")).toEqual([
      { path: "/services", kind: "services" },
      { path: "/contact" },
      { path: "/about-us" },
    ]);
  });

  it("reads 3 menu links when there is no services page, and the fallbacks when the home page was not read", () => {
    expect(followPages(`<nav><a href="/about">About</a><a href="/a">A</a><a href="/b">B</a><a href="/c">C</a><a href="/d">D</a></nav>`, "x.example")).toEqual([
      { path: "/a", kind: "menu" },
      { path: "/b", kind: "menu" },
      { path: "/c", kind: "menu" },
    ]);
    // Fewer than 3 menu links: the contact page fills the slot.
    expect(followPages(`<nav><a href="/a">A</a><a href="/b">B</a></nav>`, "x.example")).toEqual([{ path: "/a", kind: "menu" }, { path: "/b", kind: "menu" }, { path: "/contact" }]);
    expect(followPages(null, "x.example")).toEqual([{ path: "/contact" }, { path: "/about-us" }]);
  });
});
