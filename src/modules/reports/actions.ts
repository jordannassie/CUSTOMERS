"use server";

import { revalidatePath } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { checkRateLimit } from "@/modules/rate-limit";
import { createShare, ownsBusiness, revokeShare, type ShareLink } from "./dal";
import { saveBranding } from "./page/dal";
import { deleteSnapshot } from "./saved/dal";
import { savedReport, type SavedReport } from "./saved/service";
import {
  createShareLinkInput,
  deleteSnapshotInput,
  exportPdfInput,
  reportBrandingInput,
  revokeShareLinkInput,
  saveSnapshotInput,
  type ReportBrandingInput,
} from "./schema";
import { currentReport, readReport, saveReport } from "./v2/delivery/dal";
import { pdfFileName, reportTitle } from "./v2/delivery/service";
import { reportPdfPath, signedPdfUrl } from "./v2/delivery/stored/dal";

export type PdfFile = { url: string; fileName: string };

const PDF_FAILED = "The PDF could not be created. Try again in a moment.";
const PDF_LIMITED = "You've downloaded a lot of PDFs this hour. Try again later.";
const PDF_OLD = "This saved report uses the old layout. Save a new snapshot to download it as a PDF.";
const PDF_EMPTY = "There is no report to download yet. It appears after the first scan.";
const NOT_FOUND = "We could not find that business. Reload the page and try again.";
const PAGE = "/reports";

async function agencyId(): Promise<string> {
  return (await requireAgency()).agency.id;
}

export async function createShareLink(input: unknown): Promise<ActionResult<ShareLink>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = createShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be created. Reload the page and try again." };

  const link = await createShare(agency, parsed.data.businessId, parsed.data.reportId);
  if (!link) return { ok: false, status: 404, error: NOT_FOUND };
  return { ok: true, data: link };
}

export async function revokeShareLink(input: unknown): Promise<ActionResult<null>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = revokeShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be turned off. Reload the page and try again." };

  if (!(await revokeShare(agency, parsed.data.id))) {
    return { ok: false, status: 404, error: "We could not find that link. Reload the page and try again." };
  }
  return { ok: true, data: null };
}

/**
 * Download PDF (D-90): the chosen saved report, or the current one, drawn once and stored; returns a short signed URL
 * that downloads it under a readable file name.
 */
export async function exportPdf(input: unknown): Promise<ActionResult<PdfFile>> {
  let agency: string;
  let userId: string;
  try {
    const session = await requireAgency();
    agency = session.agency.id;
    userId = session.user.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = exportPdfInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: PDF_FAILED };
  // Drawing a PDF takes a few seconds of server time, so each user gets a few an hour (LIMITS.pdf_export).
  const limit = await checkRateLimit("pdf_export", userId);
  if (limit === "limited") return { ok: false, status: 429, error: PDF_LIMITED };
  if (limit === "unavailable") return { ok: false, status: 503, error: "We couldn't create the PDF just now. Try again in a few minutes." };

  const { businessId, reportId } = parsed.data;
  try {
    if (!(await ownsBusiness(agency, businessId))) return { ok: false, status: 404, error: NOT_FOUND };
    const report = reportId ? await readReport(businessId, reportId) : await currentReport(agency, businessId, new Date());
    if (report === "old") return { ok: false, status: 409, error: PDF_OLD };
    if (report === "empty") return { ok: false, status: 409, error: PDF_EMPTY };
    if (!report) return { ok: false, status: 404, error: reportId ? "We could not find that report. Reload the page and try again." : PDF_EMPTY };
    const path = await reportPdfPath(businessId, report.id);
    if (path === "old") return { ok: false, status: 409, error: PDF_OLD };
    if (!path) return { ok: false, status: 404, error: NOT_FOUND };
    const fileName = pdfFileName(report.snapshot.business.name, report.snapshot.preparedAt);
    return { ok: true, data: { url: await signedPdfUrl(path, fileName), fileName } };
  } catch (error) {
    console.error("[reports] PDF export failed:", error instanceof Error ? error.message : error);
    return { ok: false, status: 502, error: PDF_FAILED };
  }
}

/** Save snapshot: saves the report as it is now, so a link to it never changes under a client. */
export async function saveSnapshot(input: unknown): Promise<ActionResult<SavedReport>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = saveSnapshotInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The snapshot could not be saved. Reload the page and try again." };
  const now = new Date();
  const saved = await saveReport(agency, parsed.data.businessId, now, true);
  if (saved === "empty") return { ok: false, status: 409, error: "There is no score to save yet. Save a snapshot after the first scan." };
  if (!saved) return { ok: false, status: 404, error: NOT_FOUND };
  revalidatePath(PAGE);
  const { period } = saved.snapshot;
  return { ok: true, data: savedReport({ id: saved.id, title: reportTitle(now), period_start: period.start, period_end: period.end, version: 2 }) };
}

export async function removeSnapshot(input: unknown): Promise<ActionResult<null>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = deleteSnapshotInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The snapshot could not be deleted. Reload the page and try again." };
  if (!(await deleteSnapshot(agency, parsed.data.businessId, parsed.data.reportId))) {
    return { ok: false, status: 404, error: "We could not find that snapshot. Reload the page and try again." };
  }
  revalidatePath(PAGE);
  return { ok: true, data: null };
}

/** The agency's report branding (D-90): accent colour, contact email and booking link on every new report. */
export async function saveReportBranding(input: unknown): Promise<ActionResult<ReportBrandingInput>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = reportBrandingInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Check the branding and try again." };
  await saveBranding(agency, parsed.data);
  revalidatePath(PAGE);
  return { ok: true, data: parsed.data };
}
