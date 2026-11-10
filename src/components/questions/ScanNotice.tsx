import { TriangleAlert } from "lucide-react";
import { HideableNotice } from "@/components/app/HideableNotice";

/** Which AIs the last scan could not check, on one line, so a gap in the list is never read as "not asked" (BUG-074). */
export function ScanNotice({ text }: { text: string }) {
  return (
    <HideableNotice
      id="questions-scan-notice"
      text={text}
      className="rounded-md"
      icon={<TriangleAlert className="mt-[calc(5px*var(--px,1))] size-3.5 shrink-0" aria-hidden="true" />}
      testId="scan-notice"
    />
  );
}
