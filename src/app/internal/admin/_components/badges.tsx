import { Badge } from "@/components/ui/badge";
import type { ScanStatus } from "@/modules/admin";

/** Marks a test agency (or its businesses and scans) the same way on every page. */
export function TestBadge() {
  return <Badge variant="secondary">Test</Badge>;
}

// One set of words for a scan on the Scans and Business pages. Older runs without a job map onto the same five.
export const SCAN_STATUS: Record<ScanStatus, { label: string; variant: "good" | "mid" | "low" | "tint" | "outline" }> = {
  queued: { label: "Waiting", variant: "tint" },
  running: { label: "Running", variant: "mid" },
  done: { label: "Done", variant: "good" },
  failed: { label: "Failed", variant: "low" },
  skipped: { label: "Skipped", variant: "outline" },
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return <Badge variant={SCAN_STATUS[status].variant}>{SCAN_STATUS[status].label}</Badge>;
}
