import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_SCAN_PRIORITY, type AdminScan } from "@/modules/admin";
import { ScanStatusBadge } from "../../../_components/badges";
import { formatDate, plural } from "../../../_components/format";
import ScanError from "../../../_components/scan-error";
import Section, { Empty } from "./section";

export default function ScanHistory({ scans, total, businessId }: { scans: AdminScan[]; total: number; businessId: string }) {
  return (
    <Section title="Scan history" note={scanCount(scans.length, total)}>
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
                {s.checks === null ? `${noChecks(s)}. ` : `${s.checks - (s.checksFailed ?? 0)} of ${plural(s.checks, "check", "checks")}. `}
                {plural(s.credits, "credit", "credits")}.
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
                    {s.checks === null ? <span className="text-text-hint">{noChecks(s)}</span> : `${s.checks - (s.checksFailed ?? 0)} of ${s.checks}`}
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
        <Link
          href={`/internal/admin/scans?business=${businessId}`}
          className="inline-flex w-fit items-center gap-1 text-[length:calc(13px*var(--px,1))] text-primary hover:underline"
        >
          See all scans for this business
          <ArrowRight aria-hidden className="size-4" />
        </Link>
        </>
      )}
    </Section>
  );
}

// "1 scan", "12 scans, newest first", or "Showing the newest 20 of 34" once the list stops short of every scan.
export function scanCount(shown: number, total: number): string | undefined {
  if (shown === 0) return undefined;
  if (total > shown) return `Showing the newest ${shown} of ${total.toLocaleString("en-US")}`;
  return shown === 1 ? "1 scan" : `${shown} scans, newest first`;
}

// Scans from before the job queue did not record their checks; a job with no run stopped before asking anything.
function noChecks(s: AdminScan): string {
  return s.priority === null ? "Checks not recorded" : "No checks";
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
