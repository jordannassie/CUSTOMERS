"use client";

import { useTransition } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { PdfFile } from "@/modules/reports";

type ExportAction = (input: unknown) => Promise<ActionResult<PdfFile>>;

const FAILED = "The PDF could not be created. Try again in a moment.";

// The signed URL answers with a download header and the file name, so a plain link click saves the file.
function download({ url, fileName }: PdfFile) {
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName, rel: "noopener noreferrer" });
  // In the page while clicked: some browsers ignore a click on a detached link.
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Download PDF (D-90): the report PDF the agency can attach to an email. `reportId` downloads a saved report instead
 * of the current one.
 */
export function ExportPdfButton({
  businessId,
  exportPdf,
  reportId = null,
  label = "Download PDF",
  disabled = false,
}: {
  businessId: string;
  exportPdf: ExportAction;
  reportId?: string | null;
  label?: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await exportPdf({ businessId, reportId }).catch(() => null);
      if (!result?.ok) {
        toast.error(result?.error ?? FAILED);
        return;
      }
      download(result.data);
      toast.success("PDF downloaded.");
    });
  }

  return (
    <Button variant="outline" disabled={pending || disabled} onClick={run} aria-busy={pending} data-testid="export-pdf">
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : <FileDown aria-hidden />}
      {pending ? "Creating PDF…" : label}
    </Button>
  );
}
