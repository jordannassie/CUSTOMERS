import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_SCAN_PRIORITY, type AdminScan } from "@/modules/admin";
import { ScanBadge, formatDate } from "../../_components/scan-parts";
import Section, { Empty } from "./section";

export default function ScanHistory({ scans }: { scans: AdminScan[] }) {
  return (
    <Section title="Scan history" note={scans.length ? `Newest ${scans.length}` : undefined}>
      {scans.length === 0 ? (
        <Empty>This business has never been scanned.</Empty>
      ) : (
        <div className="rounded-md border border-border bg-surface">
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checks</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(s.startedAt, true)}</TableCell>
                  <TableCell>
                    <ScanBadge state={s.state} />
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {s.checks === null ? "" : `${s.checks - (s.checksFailed ?? 0)} of ${s.checks}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.credits}</TableCell>
                  <TableCell className="min-w-[220px] whitespace-normal text-muted-foreground">{details(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  );
}

function details(s: AdminScan): string {
  const parts: string[] = [];
  if (s.priority === null) parts.push("Older scan, before the job queue");
  else if (s.priority >= ADMIN_SCAN_PRIORITY) parts.push("Run by an admin");
  if (s.attempts && s.attempts > 1) parts.push(`${s.attempts} attempts`);
  if (s.error) parts.push(s.error);
  return parts.join(". ");
}
