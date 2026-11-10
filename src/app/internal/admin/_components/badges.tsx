import { Badge } from "@/components/ui/badge";
import type { ScanStatus } from "@/modules/admin";

/** Marks a test agency (or its businesses and scans) the same way on every page. */
export function TestBadge() {
  return <Badge variant="secondary">Test</Badge>;
}

// One set of words for a scan on the Scans and Business pages. Older runs without a job map onto the same five.
// The app's pill colours (src/components/app/pills.ts): blue for a scan still going, red only for a failure, grey
// for the rest.
export const SCAN_STATUS: Record<ScanStatus, { label: string; variant: "low" | "tint" | "secondary" }> = {
  queued: { label: "Waiting", variant: "secondary" },
  running: { label: "Running", variant: "tint" },
  done: { label: "Done", variant: "secondary" },
  failed: { label: "Failed", variant: "low" },
  skipped: { label: "Skipped", variant: "secondary" },
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return <Badge variant={SCAN_STATUS[status].variant}>{SCAN_STATUS[status].label}</Badge>;
}
