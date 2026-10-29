import "server-only";
// The stored PDF of one saved report (D-90): drawn once from its frozen snapshot, kept in the private "reports"
// bucket, and opened only through short signed URLs made fresh for each request. Callers check the viewer may see
// the business (its agency, or an active share link) first.
import { createServiceClient } from "@/lib/supabase/service";
import { LOGO_BUCKET, LOGO_MAX_BYTES } from "../../../logo";
import { renderReportPdf } from "../../pdf/render";
import { parseSnapshot } from "../../snapshot-schema";
import { PDF_BUCKET, pdfStoragePath, SIGNED_URL_SECONDS } from "../service";

/** The agency logo's bytes for the PDF; null for none, one too big, or one that cannot be read. */
async function logoBytes(path: string | null): Promise<Buffer | null> {
  if (!path) return null;
  const { data, error } = await createServiceClient().storage.from(LOGO_BUCKET).download(path);
  if (error || !data || data.size > LOGO_MAX_BYTES) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Where the report's PDF is stored, drawing and uploading it the first time. "old" for a version 1 row, which has no
 * PDF; null when the report is not this business's.
 */
export async function reportPdfPath(businessId: string, reportId: string): Promise<string | "old" | null> {
  const db = createServiceClient();
  const { data: row, error } = await db
    .from("reports")
    .select("snapshot, pdf_path")
    .eq("id", reportId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Reports: could not read the report: ${error.message}`);
  if (!row) return null;
  const snapshot = parseSnapshot(row.snapshot);
  if (!snapshot) return "old";
  if (row.pdf_path) return row.pdf_path;

  const pdf = await renderReportPdf(snapshot, { logo: await logoBytes(snapshot.agency.logoPath) });
  const path = pdfStoragePath(businessId, reportId);
  // upsert: two first opens at once both draw it; the second upload replaces the first with the same file.
  const upload = await db.storage.from(PDF_BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw new Error(`Reports: could not store the PDF: ${upload.error.message}`);
  const saved = await db.from("reports").update({ pdf_path: path }).eq("id", reportId).eq("business_id", businessId);
  if (saved.error) throw new Error(`Reports: could not save where the PDF is: ${saved.error.message}`);
  return path;
}

/** A fresh signed URL for a stored PDF: downloaded under `fileName`, or opened in the browser when it is null. */
export async function signedPdfUrl(path: string, fileName: string | null, seconds = SIGNED_URL_SECONDS): Promise<string> {
  const { data, error } = await createServiceClient()
    .storage.from(PDF_BUCKET)
    .createSignedUrl(path, seconds, fileName ? { download: fileName } : undefined);
  if (error || !data) throw new Error(`Reports: could not sign the PDF link: ${error?.message ?? "no URL"}`);
  return data.signedUrl;
}
