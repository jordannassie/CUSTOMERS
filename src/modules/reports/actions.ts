"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { createShare, revokeShare, withSharePage, type ShareLink } from "./dal";
import { renderPdf, siteOrigin } from "./pdf";
import { createShareLinkInput, exportPdfInput, revokeShareLinkInput } from "./schema";
import { pdfFileName } from "./service";

export type PdfFile = { fileName: string; base64: string };

const PDF_FAILED = "PDF could not be created. Try again, or use Print, Save as PDF.";

export async function createShareLink(input: unknown): Promise<ActionResult<ShareLink>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = createShareLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "The link could not be created. Reload the page and try again." };

  const link = await createShare(agencyId, parsed.data.businessId);
  if (!link) return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
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
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const parsed = exportPdfInput.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: PDF_FAILED };

  try {
    const file = await withSharePage(agencyId, parsed.data.businessId, async ({ path, businessName }) => ({
      fileName: pdfFileName(businessName, new Date()),
      base64: Buffer.from(await renderPdf(`${siteOrigin()}${path}`, businessName)).toString("base64"),
    }));
    if (!file) return { ok: false, status: 404, error: "We could not find that business. Reload the page and try again." };
    return { ok: true, data: file };
  } catch (error) {
    console.error("[reports] PDF export failed:", error instanceof Error ? error.message : error);
    return { ok: false, status: 502, error: PDF_FAILED };
  }
}
