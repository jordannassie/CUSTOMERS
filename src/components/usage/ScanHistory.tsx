import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UsageReport } from "@/modules/usage";
import { count, dayAndTime } from "./format";

const STATUS = {
  done: { label: "Finished", variant: "good" },
  running: { label: "Running", variant: "tint" },
  queued: { label: "Waiting", variant: "secondary" },
  failed: { label: "Failed", variant: "low" },
} as const;

export function ScanHistory({ scans }: { scans: UsageReport["scans"] }) {
  return (
    <section aria-labelledby="history-heading" className="rounded-md border border-border bg-surface">
      <div className="px-5 pt-5 pb-3">
        <h2 id="history-heading" className="text-[15px] font-semibold tracking-[-0.02em]">
          Scan history
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each check a model answers costs 1 credit. Checks that fail are never charged.
        </p>
      </div>
      {scans.length === 0 ? (
        <p data-testid="history-empty" className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
          No scans yet. Once your first scan runs, you will see what each one cost here.
        </p>
      ) : (
        <Table data-testid="scan-history">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Date</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Credits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => {
              const status = STATUS[scan.status as keyof typeof STATUS] ?? STATUS.queued;
              return (
                <TableRow key={scan.id} data-scan={scan.id}>
                  <TableCell className="pl-5 whitespace-nowrap tabular-nums text-muted-foreground">{dayAndTime(scan.at)}</TableCell>
                  <TableCell className="max-w-[16rem] truncate">{scan.businessName}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell data-credits className="pr-5 text-right font-medium tabular-nums">
                    {count(scan.credits)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
