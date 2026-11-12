import { Badge } from "@/components/ui/badge";
import type { ScanStatus } from "@/modules/admin";

/** Marks a test agency (or its businesses and scans) the same way on every page. */
export function TestBadge() {
  return <Badge variant="secondary">Test</Badge>;
}

// One set of words for a scan on the Scans and Business pages. Older runs without a job map onto the same five.
// A failure is a warning, in the light orange the dashboard uses for warnings; every other status is grey.
export const SCAN_STATUS: Record<ScanStatus, { label: string; variant: "mid" | "secondary" }> = {
  queued: { label: "Waiting", variant: "secondary" },
  running: { label: "Running", variant: "secondary" },
  done: { label: "Done", variant: "secondary" },
  failed: { label: "Failed", variant: "mid" },
  skipped: { label: "Skipped", variant: "secondary" },
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return <Badge variant={SCAN_STATUS[status].variant}>{SCAN_STATUS[status].label}</Badge>;
}
