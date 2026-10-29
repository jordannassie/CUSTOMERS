"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { SavedReport } from "@/modules/reports";

type SaveAction = (input: unknown) => Promise<ActionResult<SavedReport>>;
type RemoveAction = (input: unknown) => Promise<ActionResult<null>>;

const FAILED = "Something went wrong. Try again in a moment.";
const hrefOf = (id: string | null) => (id ? `/reports?report=${encodeURIComponent(id)}` : "/reports");

/**
 * Saved reports (D-90): the latest report, then each snapshot the owner saved, newest first (reports saved
 * automatically are not listed). Reports saved before the PDF are listed as "Old layout" with no PDF. Save snapshot
 * saves the report as it is now, for a link that never changes.
 */
export function SavedReports({
  businessId,
  reports,
  selected,
  canSave,
  save,
  remove,
}: {
  businessId: string;
  reports: SavedReport[];
  selected: string | null;
  canSave: boolean;
  save: SaveAction;
  remove: RemoveAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);

  function saveSnapshot() {
    startTransition(async () => {
      const result = await save({ businessId }).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? FAILED);
      toast.success("Snapshot saved. A link to it always opens this report.");
      router.push(hrefOf(result.data.id));
    });
  }

  function removeSnapshot(id: string) {
    startTransition(async () => {
      const result = await remove({ businessId, reportId: id }).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? FAILED);
      setConfirm(null);
      toast.success("Report deleted. Its share link no longer opens.");
      if (selected === id) router.push(hrefOf(null));
    });
  }

  return (
    <section aria-labelledby="saved-reports" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5" data-testid="saved-reports">
      <h2 id="saved-reports" className="text-base font-semibold tracking-[-0.02em]">
        Saved reports
      </h2>
      <ul className="-mx-2 flex flex-col gap-1">
        <li className={cn("flex items-center gap-1 rounded-md", selected === null && "bg-primary-tint")}>
          <Link
            href={hrefOf(null)}
            aria-current={selected === null ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md px-2 py-2 hover:bg-muted aria-[current=page]:hover:bg-transparent"
            data-testid="saved-report"
          >
            <span className={cn("flex items-center gap-2 text-sm font-medium", selected === null && "text-primary-hover")}>
              Latest report
              <Badge variant="good">Live</Badge>
            </span>
            <span className="text-xs text-muted-foreground">Last 30 days, updates after each scan</span>
          </Link>
        </li>
        {reports.length === 0 && (
          <li className="px-2 py-2 text-xs text-muted-foreground" data-testid="no-snapshots">
            No snapshots yet.
          </li>
        )}
        {reports.map((r) => {
          const current = r.id === selected;
          const title = (
            <span className={cn("flex flex-wrap items-center gap-2 text-sm font-medium", current && "text-primary-hover")}>
              {r.title}
              {r.old && <Badge variant="secondary">Old layout</Badge>}
            </span>
          );
          const detail = <span className="text-xs text-muted-foreground">{r.old ? `${r.detail}. No PDF` : r.detail}</span>;
          return (
            <li key={r.id} className={cn("flex items-center gap-1 rounded-md", current && "bg-primary-tint")}>
              {r.old ? (
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2" data-testid="saved-report">
                  {title}
                  {detail}
                </div>
              ) : (
                <Link
                  href={hrefOf(r.id)}
                  aria-current={current ? "page" : undefined}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md px-2 py-2 hover:bg-muted aria-[current=page]:hover:bg-transparent"
                  data-testid="saved-report"
                >
                  {title}
                  {detail}
                </Link>
              )}
              {confirm !== r.id && (
                <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`Delete ${r.title}`} onClick={() => setConfirm(r.id)}>
                  <Trash2 aria-hidden />
                </Button>
              )}
              {confirm === r.id && (
                <div className="flex shrink-0 gap-1 pr-1">
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirm(null)}>
                    Keep
                  </Button>
                  <Button variant="destructive" size="sm" disabled={pending} onClick={() => removeSnapshot(r.id)} data-testid="confirm-delete-snapshot">
                    Delete
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {canSave && (
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-fit" disabled={pending} onClick={saveSnapshot} data-testid="save-snapshot">
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Camera aria-hidden />}
            Save snapshot
          </Button>
          <p className="text-xs text-text-hint">Saves the report as it is now, to share or compare later.</p>
        </div>
      )}
    </section>
  );
}
