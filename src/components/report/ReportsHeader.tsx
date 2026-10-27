"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { PdfFile, ShareLink } from "@/modules/reports";
import { ExportPdfButton } from "./ExportPdfButton";
import { SharePanel, type CreateAction, type RevokeAction } from "./SharePanel";

const DESCRIPTION = "A full AI visibility report you can read here, download as a PDF or share as a read-only link.";

/**
 * The Reports page header: Share link opens the share panel under it (also opened by /reports?share=1, the Overview's
 * Share), and Download PDF prints the chosen report. Without results there is nothing to share or download yet.
 */
export function ReportsHeader({
  businessId,
  reportId,
  ready,
  initialLink,
  openShare,
  create,
  revoke,
  exportPdf,
}: {
  businessId: string;
  reportId: string | null;
  ready: boolean;
  initialLink: ShareLink | null;
  openShare: boolean;
  create: CreateAction;
  revoke: RevokeAction;
  exportPdf: (input: unknown) => Promise<ActionResult<PdfFile>>;
}) {
  const [open, setOpen] = useState(openShare && ready);
  const [link, setLink] = useState(initialLink);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reports"
        description={DESCRIPTION}
        actions={
          ready && (
            <div className="grid grid-cols-2 gap-3 sm:flex">
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
              <ExportPdfButton businessId={businessId} reportId={reportId} exportPdf={exportPdf} label="Download PDF" />
            </div>
          )
        }
      />
      {open && <SharePanel businessId={businessId} reportId={reportId} link={link} onLink={setLink} create={create} revoke={revoke} />}
    </div>
  );
}
