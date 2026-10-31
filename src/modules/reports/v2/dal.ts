import "server-only";
// Loads everything the version 2 report needs and builds its snapshot. The same loaders as the Overview and the
// Competitors page (request-cached), so every number matches the app. Saved answers only: no Google Places call or
// value (D-73, D-87), no scan. answer_text is read for the two excerpt answers only. Callers check the viewer may
// see this agency first.
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCompetitorsPage, namedAs, placeAmongTracked } from "@/modules/competitors";
import { pointsChange } from "@/modules/overview";
import { loadScoreReport, SCORE_WINDOW_DAYS } from "@/modules/scanning";
import { ASSISTANTS, loadStanding } from "@/modules/standing";
import { logoPath } from "../logo";
import { readBranding } from "./branding";
import { buildReportSnapshot, pooledScore } from "./build";
import { pickExcerpts } from "./excerpts/dal";
import { buildRoadmap } from "./roadmap";
import { reportSnapshotSchema, type ReportSnapshot } from "./snapshot-schema";
import { liveFixWordingWriter } from "./wording/dal";
import { wordFixes } from "./wording/word-fixes";

const STOPPED_AGENCIES = ["past_due", "canceled", "suspended", "deleted"];
// The Google table's lookups are never made for the report (D-87).
const noSignals = async () => null;

const must = <T>(what: string, r: { data: T | null; error: { message: string } | null }): T | null => {
  if (r.error) throw new Error(`Reports: could not read ${what}: ${r.error.message}`);
  return r.data;
};

/** The report for one of the agency's businesses; null when it is not theirs, was deleted or has no answers yet. */
export async function loadReportSnapshot(agencyId: string, businessId: string, now: Date): Promise<ReportSnapshot | null> {
  const db = createServiceClient();
  const [businessRead, agencyRead] = await Promise.all([
    db
      .from("businesses")
      .select("name, domain, primary_city, primary_region, status, next_scan_at, owner_user_id")
      .eq("id", businessId)
      .eq("agency_id", agencyId)
      .is("deleted_at", null)
      .maybeSingle(),
    db.from("agencies").select("name, logo_url, is_test, status, report_branding").eq("id", agencyId).maybeSingle(),
  ]);
  const business = must("the business", businessRead);
  const agency = must("the agency", agencyRead);
  if (!business || !agency) return null;

  const [report, competitors, standing] = await Promise.all([
    // 30 days before the window too, for the change on the previous 30 days (DB-012).
    loadScoreReport(agencyId, businessId, now, { historyDays: SCORE_WINDOW_DAYS }),
    loadCompetitorsPage(agencyId, businessId, now, noSignals),
    loadStanding(agencyId, businessId, now),
  ]);
  if (!report?.overall || !competitors || !standing || standing.checks.length === 0) return null;

  const checks = standing.checks;
  const appScore = Math.round(report.overall.score);
  if (appScore !== pooledScore(checks)) {
    console.warn(`Reports: the score (${appScore}) and the counted answers (${pooledScore(checks)}) differ for business ${businessId}`);
  }
  const place = placeAmongTracked(competitors.leaderboard);
  const leaderRow = place?.leader ?? competitors.leaderboard.find((r) => !r.isYou && !r.collecting) ?? null;
  const excerpts = await pickExcerpts({
    businessId,
    since: new Date(now.getTime() - SCORE_WINDOW_DAYS * 86_400_000),
    checks,
    questions: standing.questions,
    you: business.name,
    rival: leaderRow && { name: namedAs(leaderRow), tracked: leaderRow.chain?.tracked ?? [leaderRow.name] },
  });
  const brand = readBranding(agency.report_branding);
  const scheduled = business.status !== "paused" && !STOPPED_AGENCIES.includes(agency.status) && business.next_scan_at;
  const providers = new Set(checks.map((c) => c.provider));

  const snapshot = buildReportSnapshot({
    now,
    days: SCORE_WINDOW_DAYS,
    agency: {
      name: agency.name,
      logoPath: logoPath(agency.logo_url),
      ...brand,
    },
    business: {
      name: business.name,
      domain: business.domain,
      market: [business.primary_city, business.primary_region].filter(Boolean).join(", ") || null,
    },
    engines: report.models.filter((m) => providers.has(m)).map((m) => ASSISTANTS[m] ?? m),
    score: { value: appScore, margin: Math.round(report.overall.margin), change: pointsChange(report.monthChange) },
    checks,
    questions: standing.questions,
    leaderboard: competitors.leaderboard,
    competitorDomains: new Map(standing.competitors.map((c) => [c.name, c.domain])),
    excerpts,
    // A date already past means scans are not running (an ended trial, a payment problem): "Not booked yet".
    nextScanAt: scheduled && new Date(scheduled).getTime() > now.getTime() ? new Date(scheduled).toISOString() : null,
  });

  // AI wording is optional and checked against the numbers; test agencies never call AI (D-61).
  if (env.REPORT_AI_WORDING !== "true" || agency.is_test) return snapshot;
  const writer = liveFixWordingWriter({ accountUserId: business.owner_user_id, businessId });
  const fixes = await wordFixes(snapshot.fixes, snapshot, { writer, isTest: agency.is_test });
  // The roadmap names each fix by its title, so it follows the new wording.
  const above = place?.above ? namedAs(place.above) : null;
  return reportSnapshotSchema.parse({ ...snapshot, fixes, roadmap: buildRoadmap(fixes, { leader: above, nextScanAt: snapshot.roadmap.nextScanAt }) });
}
