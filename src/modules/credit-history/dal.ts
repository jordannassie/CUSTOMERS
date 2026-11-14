import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { HoldRow, LedgerRow } from "./service";

// The agency's ledger rows and scan holds for its credit history. Callers pass the agency of the signed-in user
// (requireAgency); only the columns the history shows are read. Scan spending comes from the holds, so the per-check
// capture rows (thousands) are never read here.
const MAX_ROWS = 2000;

export async function readCreditHistory(agencyId: string): Promise<{ ledger: LedgerRow[]; holds: HoldRow[] }> {
  const db = createServiceClient();
  const [ledger, holds] = await Promise.all([
    db
      .from("credit_transactions")
      .select("id, kind, delta, created_at, credit_grants(source, businesses(name))")
      .eq("agency_id", agencyId)
      .not("kind", "in", "(capture,release)")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    db
      .from("credit_holds")
      // Named: scan_jobs also points back at its hold (hold_id), so the plain embed is ambiguous.
      .select("id, status, amount, captured, created_at, scan_jobs!credit_holds_scan_job_id_fkey(businesses(name))")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
  ]);
  if (ledger.error) throw new Error(`Credit history: could not read the ledger: ${ledger.error.message}`);
  if (holds.error) throw new Error(`Credit history: could not read scans: ${holds.error.message}`);
  return {
    ledger: ledger.data.map((r) => ({
      id: r.id,
      kind: r.kind,
      delta: r.delta,
      createdAt: r.created_at,
      source: r.credit_grants?.source ?? null,
      business: r.credit_grants?.businesses?.name ?? null,
    })),
    holds: holds.data.map((h) => ({
      id: h.id,
      status: h.status,
      amount: h.amount,
      captured: h.captured,
      createdAt: h.created_at,
      business: h.scan_jobs?.businesses?.name ?? null,
    })),
  };
}
