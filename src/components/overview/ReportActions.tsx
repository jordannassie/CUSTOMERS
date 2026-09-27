import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Share (B-59) and Export PDF (B-60) are wired later; until then the buttons say plainly why they do nothing.
export function ReportActions() {
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end" data-testid="report-actions">
      <div className="flex gap-2">
        <Button variant="outline" disabled aria-describedby="report-actions-note">
          <Share2 aria-hidden="true" />
          Share
        </Button>
        <Button variant="outline" disabled aria-describedby="report-actions-note">
          <Download aria-hidden="true" />
          Export PDF
        </Button>
      </div>
      <p id="report-actions-note" className="text-xs text-text-hint">
        Share links and PDF reports are not switched on yet.
      </p>
    </div>
  );
}
