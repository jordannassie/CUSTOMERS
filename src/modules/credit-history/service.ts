// The customer's credit history (MVP test, 2026-11-14): every grant, expiry, refund and support change from the ledger,
// plus one line per scan built from its hold, with the balance after each line. Pure.
//
// Ledger rows (credit_transactions) carry every change except holds: a scan's checks are captured one credit at a time
// (thousands of rows), so a scan shows as one line from its hold's `captured` total instead. Adding up the deltas from
// the oldest line gives the balance, the same sum the credits widget shows (holds only reserve credits).

export type LedgerRow = { id: string; kind: string; delta: number; createdAt: string; source: string | null; business: string | null };
export type HoldRow = { id: string; status: string; amount: number; captured: number; createdAt: string; business: string | null };

export type HistoryKind = "plan" | "trial" | "topup" | "promo" | "support" | "refund" | "expired" | "settled" | "scan" | "running";

export type HistoryEntry = {
  id: string;
  at: string;
  kind: HistoryKind;
  label: string;
  /** Credits added (+) or used (-); 0 for a scan still running, whose credits are only held. */
  delta: number;
  /** Credits held for a scan still running, else 0. */
  held: number;
  /** The balance after this line, held credits not taken off. */
  balance: number;
};

export const HISTORY_PAGE_SIZE = 20;

const GRANT_LABEL: Record<string, { kind: HistoryKind; label: string }> = {
  plan: { kind: "plan", label: "Plan credits" },
  trial: { kind: "trial", label: "Free trial credits" },
  topup: { kind: "topup", label: "Top-up" },
  promo: { kind: "promo", label: "Promo credits" },
  admin: { kind: "support", label: "Added by support" },
  refund: { kind: "refund", label: "Credits given back" },
};

function ledgerEntry(row: LedgerRow): Omit<HistoryEntry, "balance"> | null {
  const base = { id: `t:${row.id}`, at: row.createdAt, delta: row.delta, held: 0 };
  const forBusiness = (label: string) => (row.business ? `${label}, ${row.business}` : label);
  switch (row.kind) {
    case "grant": {
      const g = GRANT_LABEL[row.source ?? ""] ?? { kind: "promo" as const, label: "Credits added" };
      return { ...base, kind: g.kind, label: forBusiness(g.label) };
    }
    case "admin_adjust":
      return { ...base, kind: "support", label: row.delta >= 0 ? "Added by support" : "Removed by support" };
    case "expire":
      return { ...base, kind: "expired", label: row.source === "trial" ? "Unused trial credits ended" : "Unused credits expired" };
    case "refund":
      return { ...base, kind: "refund", label: "Top-up refunded" };
    case "overdraft_settle":
      return { ...base, kind: "settled", label: "Paid back credits used past zero" };
    default:
      // Captures are shown per scan from the holds; releases move no credits.
      return null;
  }
}

function holdEntry(hold: HoldRow): Omit<HistoryEntry, "balance"> | null {
  const name = hold.business ?? "a removed business";
  if (hold.status === "open") {
    return { id: `h:${hold.id}`, at: hold.createdAt, kind: "running", label: `Scan of ${name}, running`, delta: -hold.captured, held: hold.amount - hold.captured };
  }
  // A scan whose checks all failed took nothing (D-53): no line.
  if (hold.captured === 0) return null;
  return { id: `h:${hold.id}`, at: hold.createdAt, kind: "scan", label: `Scan of ${name}`, delta: -hold.captured, held: 0 };
}

/** Every line, newest first, each with the balance after it. */
export function buildHistory(ledger: LedgerRow[], holds: HoldRow[]): HistoryEntry[] {
  const lines = [...ledger.map(ledgerEntry), ...holds.map(holdEntry)].filter((l): l is Omit<HistoryEntry, "balance"> => l !== null);
  lines.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  let balance = 0;
  const withBalance = lines.map((l) => {
    balance += l.delta;
    return { ...l, balance };
  });
  return withBalance.reverse();
}

/** One page of lines (1-based); a page past the end gives the last one. */
export function historyPage(entries: HistoryEntry[], page: number, size = HISTORY_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { entries: entries.slice((current - 1) * size, current * size), page: current, pages, total: entries.length };
}
