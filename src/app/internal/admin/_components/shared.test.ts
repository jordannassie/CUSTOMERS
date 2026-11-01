import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Inbox } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import AdminEmpty from "./admin-empty";
import { SCAN_STATUS, ScanStatusBadge, TestBadge } from "./badges";
import FilterTabs from "./filter-tabs";
import AdminPageHeader from "./page-header";
import { STAT_LABEL, STAT_VALUE, StatGrid, StatTile } from "./stat";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("shared admin components (2026-10-19)", () => {
  it("AdminPageHeader shows the title as the h1, the subtitle and the page actions", () => {
    const out = html(h(AdminPageHeader, { title: "Leads", subtitle: "Messages people sent.", actions: h("button", null, "Refresh") }));
    expect(out).toMatch(/<h1[^>]*>Leads<\/h1>/);
    expect(out).toContain("Messages people sent.");
    expect(out).toContain("<button>Refresh</button>");
  });

  it("StatTile uses the one label and value size", () => {
    const out = html(h(StatGrid, null, h(StatTile, { label: "Credits used", value: "1,200", note: "New this month" })));
    expect(out).toContain(`<dt class="${STAT_LABEL}">Credits used</dt>`);
    expect(out).toContain(`<dd class="${STAT_VALUE}">1,200</dd>`);
    expect(out).toContain("New this month");
  });

  it("FilterTabs are links to the filtered URL, all one height, with the current one marked", () => {
    const out = html(
      h(FilterTabs, {
        label: "Filter by status",
        active: "failed",
        tabs: [
          { key: "all", label: "All", href: "/internal/admin/scans", count: 9 },
          { key: "failed", label: "Failed", href: "/internal/admin/scans?status=failed", count: 2, alert: true },
        ],
      }),
    );
    expect(out).toContain('href="/internal/admin/scans?status=failed"');
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(out.match(/class="flex h-8 /g)).toHaveLength(2);
    expect(out).toContain("text-low-text");
  });

  it("one set of scan words on every page", () => {
    expect(Object.values(SCAN_STATUS).map((s) => s.label)).toEqual(["Waiting", "Running", "Done", "Failed", "Skipped"]);
    expect(html(h(ScanStatusBadge, { status: "queued" }))).toContain(">Waiting<");
    expect(html(h(TestBadge))).toContain(">Test<");
  });

  it("AdminEmpty shows an icon, a title and the body", () => {
    const out = html(h(AdminEmpty, { icon: Inbox, title: "No leads yet" }, "A lead shows up here."));
    expect(out).toContain("<svg");
    expect(out).toContain("No leads yet");
    expect(out).toContain("A lead shows up here.");
  });

  it("Textarea and SegmentedControl render as a textarea and a radio group", () => {
    expect(html(h(Textarea, { name: "reason", "aria-invalid": true }))).toMatch(/<textarea[^>]*name="reason"/);
    const radios = html(
      h(SegmentedControl, {
        name: "direction",
        defaultValue: "add",
        "aria-label": "Add or remove",
        options: [
          { value: "add", label: "Add" },
          { value: "remove", label: "Remove" },
        ],
      }),
    );
    expect(radios).toContain('role="radiogroup"');
    expect(radios.match(/role="radio"/g)).toHaveLength(2);
    expect(radios).toMatch(/aria-checked="true"[^>]*>Add</);
  });
});
