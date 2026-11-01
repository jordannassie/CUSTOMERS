import "server-only";
// Saving version 2 reports (D-90) and adding their fixes to Actions (D-92). reports and opportunities have owner-only
// select policies and no write policies, so writes use the service role here, after checking the business is the
// agency's (saveReport) or after a caller already did (currentReport's callers: the share link, the weekly email).
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";
import { ownsBusiness } from "../../dal";
import { logoPath } from "../../logo";
import { readBranding } from "../branding";
import { loadReportSnapshot } from "../dal";
import { parseSnapshot, type ReportFix, type ReportSnapshot } from "../snapshot-schema";
import { fixActionRow, fixDedupeKey, reportRow } from "./service";

export type SavedV2 = { id: string; snapshot: ReportSnapshot };

/** One report row of the business: its snapshot, or "old" for a version 1 row; null when there is none. */
export async function readReport(businessId: string, reportId: string): Promise<SavedV2 | "old" | null> {
  const { data, error } = await createServiceClient()
    .from("reports")
    .select("id, snapshot")
    .eq("id", reportId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the report: ${error.message}`);
  if (!data) return null;
  const snapshot = parseSnapshot(data.snapshot);
  return snapshot ? { id: data.id, snapshot } : "old";
}

/**
 * Adds the report's fixes to Actions as suggestions (D-92), each once per business: a fix whose key is already there
 * (in any column, done or dismissed too) is left as the owner has it.
 */
export async function syncFixActions(businessId: string, fixes: ReportFix[]): Promise<number> {
  if (fixes.length === 0) return 0;
  const db = createServiceClient();
  const keys = fixes.map(fixDedupeKey);
  const { data, error } = await db.from("opportunities").select("dedupe_key").eq("business_id", businessId).in("dedupe_key", keys);
  if (error) throw new Error(`Reports: could not read Actions: ${error.message}`);
  const known = new Set(data.map((r) => r.dedupe_key));
  const rows = fixes.filter((f) => !known.has(fixDedupeKey(f))).map((f) => fixActionRow(businessId, f));
  if (rows.length === 0) return 0;
  const inserted = await db.from("opportunities").insert(rows);
  if (!inserted.error) return rows.length;
  if (inserted.error.code !== "23505") throw new Error(`Reports: could not add the fixes to Actions: ${inserted.error.message}`);
  // Another save added one of them at the same moment: add the rest one at a time, skipping the ones now there.
  let added = 0;
  for (const row of rows) {
    const one = await db.from("opportunities").insert(row);
    if (!one.error) added++;
    else if (one.error.code !== "23505") throw new Error(`Reports: could not add a fix to Actions: ${one.error.message}`);
  }
  return added;
}

/**
 * Builds the report as it is now, saves it as a reports row and adds its fixes to Actions. Null when the business is
 * not the agency's or has no answers; "empty" when no answer was counted yet, since a report of nothing would only
 * confuse a client. `saved`: a snapshot the owner kept (Save snapshot), listed under Saved reports.
 */
export async function saveReport(agencyId: string, businessId: string, now: Date, saved = false): Promise<SavedV2 | "empty" | null> {
  if (!(await ownsBusiness(agencyId, businessId))) return null;
  const snapshot = await loadReportSnapshot(agencyId, businessId, now);
  if (!snapshot) return null;
  if (snapshot.named.total === 0) return "empty";
  const { data, error } = await createServiceClient()
    .from("reports")
    .insert({ ...reportRow(businessId, snapshot, now, saved), snapshot: snapshot as unknown as Json })
    .select("id")
    .single();
  if (error) throw new Error(`Reports: could not save the report: ${error.message}`);
  await syncFixActions(businessId, snapshot.fixes);
  return { id: data.id, snapshot };
}

/** When the newest answer the score counts was saved (suggested, active questions only); null with none. */
async function latestCountedAnswer(businessId: string): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("visibility_results")
    .select("created_at, tracked_prompts!inner(source, active)")
    .eq("business_id", businessId)
    .eq("tracked_prompts.source", "library")
    .eq("tracked_prompts.active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the latest answer: ${error.message}`);
  return data?.created_at ?? null;
}

// Reports newest first, as many as it takes to pass over a few old version 1 rows.
const RECENT = 5;
// The 30 days a report covers move on without new answers too, so a paused business gets a fresh one each week.
const MAX_AGE_MS = 7 * 86_400_000;

/** The agency's name, logo and branding as a report would show them now. */
async function agencyLook(agencyId: string): Promise<ReportSnapshot["agency"] | null> {
  const { data, error } = await createServiceClient().from("agencies").select("name, logo_url, report_branding").eq("id", agencyId).maybeSingle();
  if (error) throw new Error(`Reports: could not read the agency: ${error.message}`);
  return data && { name: data.name, logoPath: logoPath(data.logo_url), ...readBranding(data.report_branding) };
}

const sameLook = (a: ReportSnapshot["agency"], b: ReportSnapshot["agency"]) =>
  a.name === b.name && a.logoPath === b.logoPath && a.accent === b.accent && a.contactEmail === b.contactEmail && a.bookingUrl === b.bookingUrl;

/**
 * The report a live share link, the weekly email and the Reports page show: the newest version 2 report saved after
 * the latest counted answer (so no scan has changed its numbers), in the last week and with the agency's branding as
 * it is now; otherwise a new one saved now. Callers check the business is the agency's.
 */
export async function currentReport(agencyId: string, businessId: string, now: Date): Promise<SavedV2 | "empty" | null> {
  const [latest, look] = await Promise.all([latestCountedAnswer(businessId), agencyLook(agencyId)]);
  if (!latest || !look) return saveReport(agencyId, businessId, now);
  const { data, error } = await createServiceClient()
    .from("reports")
    .select("id, snapshot")
    .eq("business_id", businessId)
    .gt("created_at", latest)
    .gte("created_at", new Date(now.getTime() - MAX_AGE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(RECENT);
  if (error) throw new Error(`Reports: could not read saved reports: ${error.message}`);
  for (const row of data) {
    const snapshot = parseSnapshot(row.snapshot);
    if (snapshot) return sameLook(snapshot.agency, look) ? { id: row.id, snapshot } : saveReport(agencyId, businessId, now);
  }
  return saveReport(agencyId, businessId, now);
}
