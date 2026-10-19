import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { featureFilter } from "./feature-requests/_components/request-parts";
import { LeadsFilters } from "./leads/_components/leads-filters";

const filters = (unread: boolean) =>
  renderToStaticMarkup(
    createElement(LeadsFilters, {
      search: "",
      interest: "",
      source: "",
      status: "",
      unread,
      onSearch: () => {},
      onFilter: () => {},
      onToggleUnread: () => {},
    }),
  );

describe("admin buttons (2026-10-19)", () => {
  it("Unread only is filled while it is on", () => {
    const on = filters(true).match(/<button[^>]*aria-pressed="true"[^>]*>/)?.[0] ?? "";
    expect(on).toContain('data-variant="default"');
    const off = filters(false).match(/<button[^>]*aria-pressed="false"[^>]*>/)?.[0] ?? "";
    expect(off).toContain('data-variant="outline"');
  });

  it("feature request filters come from the URL, anything unknown showing all", () => {
    expect(featureFilter("planned")).toBe("planned");
    expect(featureFilter("nope")).toBe("all");
    expect(featureFilter(undefined)).toBe("all");
  });

  it("no admin page uses the browser's alert or confirm boxes", () => {
    const root = join(process.cwd(), "src/app/internal/admin");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx"));
    for (const f of files) expect(readFileSync(join(root, f), "utf8"), f).not.toMatch(/\b(alert|confirm)\(/);
  });
});
