import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Pagination, { pageHref } from "./pagination";

describe("admin pagination (50 a page)", () => {
  it("keeps the filter and search in every page link, and page 1 has no page number", () => {
    expect(pageHref("/internal/admin/agencies", { status: "active", q: "acme" }, 2)).toBe("/internal/admin/agencies?status=active&q=acme&page=2");
    expect(pageHref("/internal/admin/agencies", { status: undefined, q: "acme" }, 1)).toBe("/internal/admin/agencies?q=acme");
    expect(pageHref("/internal/admin/businesses", {}, 1)).toBe("/internal/admin/businesses");
  });

  it("says which rows show and links the pages either side", () => {
    const html = renderToStaticMarkup(
      createElement(Pagination, { base: "/internal/admin/businesses", params: {}, page: 2, pages: 3, total: 120, pageSize: 50, noun: "businesses" }),
    );
    expect(html).toContain("51 to 100 of 120 businesses");
    expect(html).toContain("Page 2 of 3");
    expect(html).toContain('href="/internal/admin/businesses"');
    expect(html).toContain('href="/internal/admin/businesses?page=3"');
  });
});
