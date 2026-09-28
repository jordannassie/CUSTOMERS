import "server-only";
import { requireAgency } from "@/modules/auth";
import { loadScoreReport } from "@/modules/scanning";
import { createServiceClient } from "@/lib/supabase/service";
import { overviewView, type Impact, type OverviewView } from "./service";

// Legacy statuses: "in_progress" is still something to do, "resolved" and "dismissed" are not.
const OPEN_STATUSES = ["open", "in_progress"];

/** The Overview for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getOverview(businessId: string): Promise<OverviewView | null> {
  const { agency } = await requireAgency({ next: "/dashboard" });
  return loadOverview(agency.id, businessId, new Date());
}

// Callers check the viewer may see this agency first (the signed-in owner, or a live share link).
export async function loadOverview(agencyId: string, businessId: string, now: Date): Promise<OverviewView | null> {
  const report = await loadScoreReport(agencyId, businessId, now);
  if (!report) return null;

  // Ownership is settled by the report above.
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .select("id, title, impact, created_at")
    .eq("business_id", businessId)
    .in("status", OPEN_STATUSES);
  if (error) throw new Error(`Overview: could not read opportunities: ${error.message}`);

  return overviewView(
    report,
    data.map((o) => ({ id: o.id, title: o.title, impact: o.impact as Impact, createdAt: o.created_at })),
  );
}
