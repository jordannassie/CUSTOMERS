import "server-only";
// Saving an explanation's fixes and knowing when they are ready (MVP_SPEC 7.2). The worker writes with the service
// role after a scan; the pages read fixesState after checking the business is the agency's.
import { providerErrorKind } from "@/lib/provider-error-kind";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import type { Explanation, OpportunityDraft } from "../explain";
import { fallbackMessage, fixesPending, saveFor } from "./service";
import { trackedWording } from "../tracked-wording";

export type SaveOutcome = "saved" | "superseded";

/**
 * Saves the run's fixes unless a newer completed scan of the business exists: two scans close together (a rescan)
 * explain in parallel, and the older one finishing last used to replace the newer one's fixes.
 */
export async function saveExplanation(businessId: string, runId: string, explanation: Explanation): Promise<SaveOutcome> {
  const db = createServiceClient();
  const run = await db.from("visibility_runs").select("completed_at, created_at").eq("id", runId).single();
  if (run.error) throw new Error(`Insights: could not load the run: ${run.error.message}`);
  const since = run.data.completed_at ?? run.data.created_at;
  const newer = await db
    .from("visibility_runs")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .neq("id", runId)
    .gt("completed_at", since)
    .limit(1);
  if (newer.error) throw new Error(`Insights: could not check for a newer scan: ${newer.error.message}`);
  if (newer.data.length > 0) return "superseded";

  const existing = await db.from("opportunities").select("id, title, status, source, affected_url").eq("business_id", businessId);
  if (existing.error) throw new Error(`Insights: could not load opportunities: ${existing.error.message}`);
  const { insert, update, removeIds } = saveFor(existing.data, explanation);
  // The AI's order, kept so the lists show its fixes the way it ranked them (lib/fix-order.ts). The rules have none:
  // their fixes come after the AI's within an impact.
  const rankOf = new Map(explanation.drafts.map((d, i) => [d, i]));
  const evidenceData = (d: OpportunityDraft) => (explanation.source === "ai" ? { rank: rankOf.get(d) ?? null } : {});
  const text = (d: OpportunityDraft) => ({
    title: trackedWording(d.title),
    description: trackedWording(d.description),
    evidence: trackedWording(d.evidence),
    impact: d.impact,
    category: d.category,
    recommended_action: trackedWording(d.recommended_action),
    claude_prompt: d.claude_prompt === null ? null : trackedWording(d.claude_prompt),
    evidence_data: evidenceData(d),
  });
  // Insert first, so a failure leaves the old list rather than an empty one.
  if (insert.length > 0) {
    // Every column named on every row: in a many-row insert a missing one is sent as null for that row.
    const rows = insert.map((d) => ({ business_id: businessId, status: "open", ...text(d) }));
    const { error } = await db.from("opportunities").insert(rows);
    if (error) throw new Error(`Insights: could not save opportunities: ${error.message}`);
  }
  // The same fix suggested again keeps its row (id, created_at), so ?fix= links and "new this week" stay right. Only
  // while nobody has taken it up: a fix moved to To do since the list was read keeps the user's version.
  const updatedAt = new Date().toISOString();
  for (const { id, draft } of update) {
    const { error } = await db.from("opportunities").update({ ...text(draft), updated_at: updatedAt }).eq("id", id).eq("business_id", businessId).eq("status", "open").eq("source", "scan");
    if (error) throw new Error(`Insights: could not update an opportunity: ${error.message}`);
  }
  if (removeIds.length > 0) {
    // Only fixes a scan wrote and nobody has taken up yet: ones added from Compare or Sources stay (migration 078).
    const { error } = await db.from("opportunities").delete().in("id", removeIds).eq("status", "open").eq("source", "scan");
    if (error) throw new Error(`Insights: could not replace old opportunities: ${error.message}`);
  }
  return "saved";
}

/** One provider_errors row (grouped per hour, migration 058) when the fixed rules stood in for the writer. */
export async function recordExplainFallback(explanation: Explanation): Promise<void> {
  const message = fallbackMessage(explanation);
  if (!message) return;
  console.warn(message);
  const provider = explanation.writer?.provider ?? "anthropic";
  const { error } = await createServiceClient().rpc("record_provider_error", { p_provider: provider, p_kind: providerErrorKind(message), p_message: message });
  if (error) console.error(`Could not record the explanation fallback: ${error.message}`);
}

/** Marks the run's explanation finished, whatever happened, so the pages stop saying "Working out your fixes". */
export async function markExplained(runId: string, now = new Date()): Promise<void> {
  const { error } = await createServiceClient().from("visibility_runs").update({ explained_at: now.toISOString() }).eq("id", runId);
  if (error) console.error(`Could not mark run ${runId} explained: ${error.message}`);
}

export type FixesState = { everScanned: boolean; pending: boolean };

/** Callers check the business is the agency's. Whether it ever finished a scan, and whether fixes are on their way. */
export async function loadFixesState(businessId: string, now = new Date()): Promise<FixesState> {
  const { data, error } = await createServiceClient()
    .from("visibility_runs")
    .select("completed_at, explained_at")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw new Error(`Insights: could not load the latest scan: ${error.message}`);
  const latest = data[0] ? { completedAt: data[0].completed_at, explainedAt: data[0].explained_at } : null;
  return { everScanned: latest !== null, pending: fixesPending(latest, now) };
}

/** The fixes state of one of the agency's businesses; null when it is not theirs. */
export async function agencyFixesState(agencyId: string, businessId: string): Promise<FixesState | null> {
  const { data, error } = await createServiceClient().from("businesses").select("id").eq("id", businessId).eq("agency_id", agencyId).maybeSingle();
  if (error) throw new Error(`Insights: could not load the business: ${error.message}`);
  return data ? loadFixesState(businessId) : null;
}

/** For the Opportunities page and the Overview: null when the business is not the signed-in agency's. */
export async function getFixesState(businessId: string, next = "/actions"): Promise<FixesState | null> {
  const { agency } = await requireAgency({ next });
  return agencyFixesState(agency.id, businessId);
}
