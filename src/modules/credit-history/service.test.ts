import { describe, expect, it } from "vitest";
import { buildHistory, historyPage, type HoldRow, type LedgerRow } from "./service";

const ledger = (id: string, kind: string, delta: number, at: string, source: string | null = null, business: string | null = null): LedgerRow => ({
  id,
  kind,
  delta,
  createdAt: at,
  source,
  business,
});
const hold = (id: string, status: string, amount: number, captured: number, at: string, business: string | null = "Bean House"): HoldRow => ({
  id,
  status,
  amount,
  captured,
  createdAt: at,
  business,
});

describe("buildHistory", () => {
  it("lists grants, scans and expiries newest first, with the balance after each line", () => {
    const lines = buildHistory(
      [
        ledger("g1", "grant", 150, "2026-11-01T00:00:00Z", "trial"),
        ledger("x1", "expire", -78, "2026-11-08T00:00:00Z", "trial"),
        ledger("g2", "grant", 1200, "2026-11-08T00:00:01Z", "plan", "Bean House"),
      ],
      [hold("h1", "closed", 36, 36, "2026-11-02T00:00:00Z"), hold("h2", "closed", 36, 36, "2026-11-05T00:00:00Z")],
    );

    expect(lines.map((l) => [l.label, l.delta, l.balance])).toEqual([
      ["Plan credits, Bean House", 1200, 1200],
      ["Unused trial credits ended", -78, 0],
      ["Scan of Bean House", -36, 78],
      ["Scan of Bean House", -36, 114],
      ["Free trial credits", 150, 150],
    ]);
  });

  it("shows a running scan's held credits without taking them off the balance, and skips scans that took nothing", () => {
    const lines = buildHistory(
      [ledger("g1", "grant", 100, "2026-11-01T00:00:00Z", "topup")],
      [hold("h1", "open", 36, 10, "2026-11-02T00:00:00Z"), hold("h2", "closed", 36, 0, "2026-11-03T00:00:00Z")],
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ kind: "running", label: "Scan of Bean House, running", delta: -10, held: 26, balance: 90 });
  });

  it("words support changes, refunds and overdraft paybacks without admin notes", () => {
    const lines = buildHistory(
      [
        ledger("a1", "admin_adjust", 50, "2026-11-01T00:00:00Z"),
        ledger("a2", "admin_adjust", -10, "2026-11-02T00:00:00Z"),
        ledger("r1", "refund", -500, "2026-11-03T00:00:00Z"),
        ledger("s1", "overdraft_settle", 32, "2026-11-04T00:00:00Z"),
        ledger("c1", "capture", -1, "2026-11-04T00:00:00Z"),
      ],
      [],
    );

    expect(lines.map((l) => l.label)).toEqual([
      "Paid back credits used past zero",
      "Top-up refunded",
      "Removed by support",
      "Added by support",
    ]);
  });
});

describe("historyPage", () => {
  const entries = buildHistory(
    Array.from({ length: 45 }, (_, i) => ledger(`g${i}`, "grant", 1, `2026-11-01T00:00:${String(i).padStart(2, "0")}Z`, "promo")),
    [],
  );

  it("pages 20 at a time and gives the last page for a page past the end", () => {
    expect(historyPage(entries, 1)).toMatchObject({ page: 1, pages: 3, total: 45 });
    expect(historyPage(entries, 3).entries).toHaveLength(5);
    expect(historyPage(entries, 99).page).toBe(3);
    expect(historyPage(entries, Number.NaN).page).toBe(1);
  });
});
