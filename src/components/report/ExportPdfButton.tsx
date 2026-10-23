"use client";

import { useTransition } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { PdfFile } from "@/modules/reports";

type ExportAction = (input: unknown) => Promise<ActionResult<PdfFile>>;

const FAILED = "PDF could not be created. Try again, or use Print, Save as PDF.";

function save({ fileName, base64 }: PdfFile) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Export PDF (B-60): the share page as a PDF the agency can attach to an email. */
export function ExportPdfButton({ businessId, exportPdf }: { businessId: string; exportPdf: ExportAction }) {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await exportPdf({ businessId }).catch(() => null);
      if (!result?.ok) {
        toast.error(result?.error ?? FAILED);
        return;
      }
      save(result.data);
      toast.success("PDF downloaded.");
    });
  }

  return (
    <Button variant="outline" disabled={pending} onClick={run} aria-busy={pending} data-testid="export-pdf">
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : <FileDown aria-hidden />}
      {pending ? "Creating PDF…" : "Export PDF"}
    </Button>
  );
}
