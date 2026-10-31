import { TriangleAlert } from "lucide-react";

/** Which AIs the last scan could not check, on one line, so a gap in the list is never read as "not asked" (BUG-074). */
export function ScanNotice({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-md border border-mid/30 bg-mid-bg px-3 py-2 text-[13px] text-mid-text" data-testid="scan-notice">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
