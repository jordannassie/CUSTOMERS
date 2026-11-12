import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_SCAN_PRIORITY, type AdminScan } from "@/modules/admin";
import { ScanStatusBadge } from "../../../_components/badges";
import { formatDate } from "../../../_components/format";
import ScanError from "../../../_components/scan-error";
import Section, { Empty } from "./section";

export default function ScanHistory({ scans }: { scans: AdminScan[] }) {
  return (
    <Section title="Scan history" note={scanCount(scans.length)}>
      {scans.length === 0 ? (
        <Empty>This business has never been scanned.</Empty>
      ) : (
        <>
        {/* Cards on phones, so the history never scrolls sideways; the table from md up. */}
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))] md:hidden">
          {scans.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="tabular text-muted-foreground">{formatDate(s.startedAt, true)}</span>
                <ScanStatusBadge status={s.state} />
              </div>
              <p className="tabular text-muted-foreground">
                {s.checks === null ? "" : `${s.checks - (s.checksFailed ?? 0)} of ${s.checks} checks. `}
                {s.credits} credits.
              </p>
              <p className="text-muted-foreground">{details(s)}</p>
              <ScanError error={s.error} />
            </li>
          ))}
        </ul>
        <div className="hidden rounded-md border border-border bg-surface md:block">
          <Table className="text-[length:calc(13px*var(--px,1))]">
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
                    <ScanStatusBadge status={s.state} />
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {s.checks === null ? "" : `${s.checks - (s.checksFailed ?? 0)} of ${s.checks}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.credits}</TableCell>
                  <TableCell className="min-w-[calc(220px*var(--px,1))] whitespace-normal text-muted-foreground">
                    {details(s)}
                    <ScanError error={s.error} className="mt-1" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </Section>
  );
}

// "1 scan", "12 scans, newest first"; the list keeps the newest 20.
function scanCount(n: number): string | undefined {
  if (n === 0) return undefined;
  return n === 1 ? "1 scan" : `${n} scans, newest first`;
}

function details(s: AdminScan): string {
  const parts: string[] = [];
  if (s.priority === null) parts.push("Older scan, before the job queue");
  else if (s.priority === ADMIN_SCAN_PRIORITY) parts.push("Run by an admin");
  else if (s.priority === 0) parts.push("Scheduled");
  else parts.push("Run from the app");
  if (s.attempts && s.attempts > 1) parts.push(`${s.attempts} attempts`);
  return `${parts.join(". ")}.`;
}
