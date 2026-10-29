"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { EmailSnapshot, PdfFile, ShareLink } from "@/modules/reports";
import { CopyEmailSummary } from "./CopyEmailSummary";
import { ExportPdfButton } from "./ExportPdfButton";
import { SharePanel, type CreateAction, type RevokeAction } from "./SharePanel";

const DESCRIPTION = "Your client's AI visibility report. Download the PDF, share a link to it, or paste a summary into an email.";

/**
 * The Reports page header (D-90): Share link opens the share panel under it (also opened by /reports?share=1, the
 * Overview's Share), Copy email summary copies the shown report's numbers with its link, and Download PDF saves the
 * PDF. `summary` null: no report to send yet (no answers, or a saved report in the old layout).
 */
export function ReportsHeader({
  businessId,
  reportId,
  summary,
  initialLink,
  openShare,
  create,
  revoke,
  exportPdf,
}: {
  businessId: string;
  reportId: string | null;
  summary: EmailSnapshot | null;
  initialLink: ShareLink | null;
  openShare: boolean;
  create: CreateAction;
  revoke: RevokeAction;
  exportPdf: (input: unknown) => Promise<ActionResult<PdfFile>>;
}) {
  const ready = summary !== null;
  const [open, setOpen] = useState(openShare && ready);
  const [link, setLink] = useState(initialLink);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reports"
        description={DESCRIPTION}
        actions={
          ready && (
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Button
                variant={open ? "secondary" : "outline"}
                aria-expanded={open}
                aria-controls="share-panel"
                onClick={() => setOpen((o) => !o)}
                data-testid="share-button"
              >
                <Link2 aria-hidden />
                Share link
              </Button>
              <CopyEmailSummary businessId={businessId} reportId={reportId} summary={summary} link={link} onLink={setLink} create={create} />
              <ExportPdfButton businessId={businessId} reportId={reportId} exportPdf={exportPdf} />
            </div>
          )
        }
      />
      {open && <SharePanel businessId={businessId} reportId={reportId} link={link} onLink={setLink} create={create} revoke={revoke} />}
    </div>
  );
}
