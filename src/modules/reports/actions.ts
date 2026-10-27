"use server";

import { revalidatePath } from "next/cache";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { checkRateLimit } from "@/modules/rate-limit";
import { createShare, recordPdfError, revokeShare, withSharePage, type ShareLink } from "./dal";
import { PdfError, renderPdf, siteOrigin } from "./pdf";
import { createSnapshot, deleteSnapshot, saveHidden } from "./saved/dal";
import {
  createShareLinkInput,
  deleteSnapshotInput,
  exportPdfInput,
  revokeShareLinkInput,
  saveReportSectionsInput,
  saveSnapshotInput,
} from "./schema";
import type { SectionId } from "./sections";
import { pdfFileName } from "./service";
import type { SavedReport } from "./snapshot";

export type PdfFile = { fileName: string; base64: string };

const PDF_FAILED = "PDF could not be created. Try again, or use Print, Save as PDF.";
const PDF_LIMITED = "You've exported a lot of PDFs this hour. Try again later, or use Print, Save as PDF.";
const NOT_FOUND = "We could not find that business. Reload the page and try again.";
const PAGE = "/reports";

async function agencyId(): Promise<string> {
  return (await requireAgency()).agency.id;
}

export async function createShareLink(input: unknown): Promise<ActionResult<ShareLink>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = createShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be created. Reload the page and try again." };

  const link = await createShare(agencyId, parsed.data.businessId, parsed.data.reportId);
  if (!link) return { ok: false, status: 404, error: NOT_FOUND };
  return { ok: true, data: link };
}

export async function revokeShareLink(input: unknown): Promise<ActionResult<null>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = revokeShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be turned off. Reload the page and try again." };

  if (!(await revokeShare(agencyId, parsed.data.id))) {
    return { ok: false, status: 404, error: "We could not find that link. Reload the page and try again." };
  }
  return { ok: true, data: null };
}

/** Export PDF (B-60, D-71): prints the business's share page and returns the file for the browser to save. */
export async function exportPdf(input: unknown): Promise<ActionResult<PdfFile>> {
  let agencyId: string;
  let userId: string;
  try {
    const { user, agency } = await requireAgency();
    agencyId = agency.id;
    userId = user.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = exportPdfInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: PDF_FAILED };
  // Each PDF opens the page in a hosted browser, so each user gets a few an hour (LIMITS.pdf_export).
  const limit = await checkRateLimit("pdf_export", userId);
  if (limit === "limited") return { ok: false, status: 429, error: PDF_LIMITED };
  if (limit === "unavailable") return { ok: false, status: 503, error: "We couldn't create the PDF just now. Try again in a few minutes." };

  try {
    const file = await withSharePage(
      agencyId,
      parsed.data.businessId,
      async ({ path, businessName }) => ({
        fileName: pdfFileName(businessName, new Date()),
        base64: Buffer.from(await renderPdf(`${siteOrigin()}${path}`, businessName)).toString("base64"),
      }),
      parsed.data.reportId,
    );
    if (!file) return { ok: false, status: 404, error: NOT_FOUND };
    return { ok: true, data: file };
  } catch (error) {
    console.error("[reports] PDF export failed:", error instanceof Error ? error.message : error);
    if (error instanceof PdfError) await recordPdfError(error.message);
    return { ok: false, status: 502, error: PDF_FAILED };
  }
}

/** Save snapshot: freezes the live report as it is now, so a link to it never changes under a client. */
export async function saveSnapshot(input: unknown): Promise<ActionResult<SavedReport>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = saveSnapshotInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The snapshot could not be saved. Reload the page and try again." };
  const saved = await createSnapshot(agency, parsed.data.businessId, new Date());
  if (saved === "empty") return { ok: false, status: 409, error: "There is no score to save yet. Save a snapshot after the first scan." };
  if (!saved) return { ok: false, status: 404, error: NOT_FOUND };
  revalidatePath(PAGE);
  return { ok: true, data: saved };
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

/** Section toggles: hidden sections are left out of the page, every share link and the PDF. */
export async function saveReportSections(input: unknown): Promise<ActionResult<{ hidden: SectionId[] }>> {
  let agency: string;
  try {
    agency = await agencyId();
  } catch (error) {
    return authFailure(error);
  }
  const parsed = saveReportSectionsInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Keep at least one section in the report." };
  if (!(await saveHidden(agency, parsed.data.businessId, parsed.data.hidden))) return { ok: false, status: 404, error: NOT_FOUND };
  revalidatePath(PAGE);
  return { ok: true, data: { hidden: parsed.data.hidden } };
}
