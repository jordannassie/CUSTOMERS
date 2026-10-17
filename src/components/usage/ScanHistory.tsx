import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UsageReport } from "@/modules/usage";
import { count, credits } from "./format";
import { LocalDayAndTime } from "./LocalTime";

const STATUS = {
  done: { label: "Finished", variant: "good" },
  running: { label: "Running", variant: "tint" },
  queued: { label: "Waiting", variant: "secondary" },
  failed: { label: "Failed", variant: "low" },
  skipped: { label: "Did not run", variant: "secondary" },
} as const;

const statusOf = (s: string) => STATUS[s as keyof typeof STATUS] ?? STATUS.queued;

/** Checks answered from the shared answer cache (H1): the same answer as a recent scan, still 1 credit each. */
function Reused({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span data-reused className="block text-xs text-muted-foreground">
      {n === 1 ? "1 reused answer" : `${count(n)} reused answers`}
    </span>
  );
}

export function ScanHistory({ scans }: { scans: UsageReport["scans"] }) {
  return (
    <section aria-labelledby="history-heading" className="rounded-md border border-border bg-surface">
      <div className="px-5 pt-5 pb-3">
        <h2 id="history-heading" className="text-base font-semibold tracking-[-0.02em]">
          Scan history
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Each check a model answers costs 1 credit, including answers reused from a recent scan. Checks that fail are
          never charged.
        </p>
      </div>
      {scans.length === 0 ? (
        <p data-testid="history-empty" className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
          No scans yet. Once your first scan runs, you will see what each one cost here.
        </p>
      ) : (
        <>
          {/* Phones get a stacked list so the credits column never scrolls out of view. */}
          <ul data-testid="scan-history-list" className="divide-y divide-border border-t border-border sm:hidden">
            {scans.map((scan) => {
              const status = statusOf(scan.status);
              return (
                <li key={scan.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm" title={scan.businessName}>{scan.businessName}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      <LocalDayAndTime iso={scan.at} />
                    </p>
                    <Reused n={scan.reused} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium tabular-nums">{credits(scan.credits)}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden sm:block">
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
                  const status = statusOf(scan.status);
                  return (
                    <TableRow key={scan.id} data-scan={scan.id}>
                      <TableCell className="pl-5 whitespace-nowrap tabular-nums text-muted-foreground">
                        <LocalDayAndTime iso={scan.at} />
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate">{scan.businessName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Reused n={scan.reused} />
                        </div>
                      </TableCell>
                      <TableCell data-credits className="pr-5 text-right font-medium tabular-nums">
                        {count(scan.credits)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
