import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { cn } from "cn";
import { explainScanError, retryScan, type AdminScanRow, type ScanListQuery } from "@/modules/admin";
import AdminEmpty from "../../_components/admin-empty";
import { SCAN_STATUS, TestBadge } from "../../_components/badges";
import { plural } from "../../_components/format";
import ScanError from "../../_components/scan-error";
import RetryButton from "./retry-button";
import { costCell } from "./scan-cells";
import { hasFilters, SCANS_BASE } from "./scan-href";

const MODELS: Record<string, { label: string; dot: string }> = {
  openai: { label: "ChatGPT", dot: "bg-chatgpt" },
  anthropic: { label: "Claude", dot: "bg-claude" },
  perplexity: { label: "Perplexity", dot: "bg-perplexity" },
};

export function ModelList({ models, className }: { models: string[]; className?: string }) {
  if (models.length === 0) return <span className="text-text-hint">None</span>;
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {models.map((m) => (
        <li key={m} className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={cn("size-2 rounded-full", MODELS[m]?.dot ?? "bg-competitor-2")} />
          {MODELS[m]?.label ?? m}
        </li>
      ))}
    </ul>
  );
}

export function Dash() {
  return (
    <span aria-label="None" className="text-text-hint">
      -
    </span>
  );
}

/** The Real cost cell: an amount, "Not recorded", "$0.00" for a test agency, or a dash when it never ran. */
export function Cost({ row }: { row: AdminScanRow }) {
  const cell = costCell(row);
  if (!cell.text) return <Dash />;
  return (
    <span className={cn(cell.muted && "text-text-hint")} title={cell.title}>
      {cell.text}
    </span>
  );
}

/**
 * What went wrong and what to do: the error in plain words, a done scan's missing checks, and Retry or why there is
 * none. Retry sits under the reason it fixes, so the table needs no extra column and fits at 1440px.
 */
export function Outcome({ row, clamp = false, className }: { row: AdminScanRow; clamp?: boolean; className?: string }) {
  const nothing = !row.error && !row.note && !row.canRetry && !row.retryNote;
  if (nothing) return clamp ? <Dash /> : null;
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      {row.error && <ScanError error={row.error} clamp={clamp} />}
      {row.note && <p className="whitespace-normal text-foreground">{row.note}</p>}
      {row.retryNote && <p className="whitespace-normal text-muted-foreground">{row.retryNote}</p>}
      {row.canRetry && (
        <RetryButton
          jobId={row.id}
          businessName={row.businessName}
          credits={row.scanCredits}
          agencyName={row.agencyName}
          reason={explainScanError(row.error)?.summary ?? null}
          retry={retryScan}
        />
      )}
    </div>
  );
}

export function BusinessCell({ row }: { row: AdminScanRow }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/internal/admin/businesses/${row.businessId}`}
        className="block truncate text-[length:calc(14px*var(--px,1))] font-medium text-primary hover:underline"
        title={row.businessName}
      >
        {row.businessName}
      </Link>
      <p className="flex items-center gap-1.5 truncate text-[length:calc(12px*var(--px,1))] text-muted-foreground">
        {row.agencyId ? (
          <Link href={`/internal/admin/agencies/${row.agencyId}`} className="truncate hover:text-primary hover:underline" title={row.agencyName}>
            {row.agencyName}
          </Link>
        ) : (
          <span className="truncate">No agency</span>
        )}
        {row.isTest && <TestBadge />}
        {row.attempts > 1 && <span className="tabular whitespace-nowrap">{plural(row.attempts, "try", "tries")}</span>}
      </p>
    </div>
  );
}

/**
 * Nothing yet, or nothing matching. With any filter on (status, agency, business, dates, real or test only) it says
 * so and offers to clear them (admin audit 2026-11-12: an agency with no scans read "No scans yet").
 */
export function ScansEmpty({ query }: { query: ScanListQuery }) {
  if (!hasFilters(query)) {
    return (
      <AdminEmpty icon={ScanSearch} title="No scans yet">
        Scans show up here as soon as a business is waiting for one.
      </AdminEmpty>
    );
  }
  // Only the Failed tab on: good news, not a filter problem.
  const onlyFailed = query.status === "failed" && !hasFilters({ ...query, status: undefined });
  if (onlyFailed) {
    return (
      <AdminEmpty icon={ScanSearch} title={`No ${SCAN_STATUS.failed.label.toLowerCase()} scans`}>
        Every scan finished or is still on its way.
      </AdminEmpty>
    );
  }
  return (
    <AdminEmpty icon={ScanSearch} title="No scans match these filters">
      <p>Try a wider date range or another agency.</p>
      <Link href={SCANS_BASE} className="mt-2 inline-block font-medium text-primary hover:underline">
        Clear filters
      </Link>
    </AdminEmpty>
  );
}
