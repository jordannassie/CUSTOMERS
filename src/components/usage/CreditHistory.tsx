import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HistoryEntry, HistoryKind } from "@/modules/credit-history";
import { count } from "./format";
import { LocalDayAndTime } from "./LocalTime";

type Props = { entries: HistoryEntry[]; page: number; pages: number; total: number; href: (page: number) => string };

const TAG: Partial<Record<HistoryKind, { label: string; variant: "secondary" | "tint" | "low" }>> = {
  running: { label: "Running", variant: "tint" },
  expired: { label: "Expired", variant: "secondary" },
};

const signed = (n: number) => (n > 0 ? `+${count(n)}` : n < 0 ? `−${count(-n)}` : "0");

function Change({ entry }: { entry: HistoryEntry }) {
  return (
    <span className={entry.delta > 0 ? "font-medium text-good-text tabular-nums" : "tabular-nums"}>
      {signed(entry.delta)}
      {entry.held > 0 && <span className="block text-xs text-muted-foreground">{count(entry.held)} held</span>}
    </span>
  );
}

function Label({ entry }: { entry: HistoryEntry }) {
  const tag = TAG[entry.kind];
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 break-words">{entry.label}</span>
      {tag && <Badge variant={tag.variant}>{tag.label}</Badge>}
    </span>
  );
}

// The customer's own credit history (MVP test, 2026-11-14): what came in, what scans used, what expired.
export function CreditHistory({ entries, page, pages, total, href }: Props) {
  return (
    <section aria-labelledby="credit-history-heading" data-testid="credit-history" className="rounded-md border border-border bg-surface">
      <div className="px-4 pt-4 pb-3">
        <h2 id="credit-history-heading" className="text-base font-semibold tracking-[-0.02em]">
          Credit history
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Every credit added, used or expired, newest first. Credits held for a scan that is still running are taken
          only when its checks finish.
        </p>
      </div>
      {total === 0 ? (
        <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No credits yet. Your trial or plan credits will show here.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border sm:hidden">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Label entry={e} />
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    <LocalDayAndTime iso={e.at} />
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Change entry={e} />
                  <p className="text-xs tabular-nums text-muted-foreground">Balance {count(e.balance)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden border-t border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>What happened</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      <LocalDayAndTime iso={e.at} />
                    </TableCell>
                    <TableCell>
                      <Label entry={e} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Change entry={e} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count(e.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pages > 1 && (
            <nav aria-label="Credit history pages" className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
              {page > 1 ? (
                <Link href={href(page - 1)} scroll={false} className="inline-flex min-h-6 items-center font-medium hover:underline">
                  Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="tabular-nums text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={href(page + 1)} scroll={false} className="inline-flex min-h-6 items-center font-medium hover:underline">
                  Older
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
