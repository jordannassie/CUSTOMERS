import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAgencyRecent, SCAN_STATUSES, type ScanStatus } from "@/modules/admin";
import { ScanStatusBadge } from "../../../_components/badges";
import { formatDate, money } from "../../../_components/format";
import ScanError from "../../../_components/scan-error";
import { StatTile } from "../../../_components/stat";
import Section, { Empty } from "../../../businesses/[id]/_components/section";
import { credits } from "../../_components/agency-parts";

/**
 * What the agency spent lately and its newest scans (admin review 2026-11-12): until now support had to open the Scans
 * and Usage pages to see any of it. Streams in after the rest of the page. The Stripe links sit with the actions.
 */
export default async function AgencyRecent({ agencyId, deleted }: { agencyId: string; deleted: boolean }) {
  const recent = await loadAgencyRecent(agencyId);
  if (!recent) return null;
  const { lastDays, scans, lastRun } = recent;
  return (
    <div className="flex flex-col gap-8">
      {/* Three across from sm, so a full date fits on one line next to the sidebar. */}
      <dl
        aria-label={`Last ${lastDays.days} days`}
        className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3"
      >
        <StatTile
          label={`Credits used, last ${lastDays.days} days`}
          value={credits(lastDays.credits)}
          note={lastDays.freeCredits > 0 ? `${credits(lastDays.freeCredits)} of them free (trial, promo or admin)` : undefined}
        />
        <StatTile label={`Real AI cost, last ${lastDays.days} days`} value={money(lastDays.costUsd) || "$0.00"} />
        {/* Done or failed only: a skipped or waiting scan did not run, and the list below shows those anyway. */}
        <StatTile
          label="Last scan that ran"
          value={lastRun ? formatDate(lastRun.at) : "None yet"}
          note={lastRun ? `${lastRun.status === "failed" ? "Failed" : "Finished"}, ${lastRun.businessName}` : undefined}
        />
      </dl>

      <Section title="Recent scans" note={scans.length > 0 ? "Newest first, by the time each scan started" : undefined}>
        {scans.length === 0 ? (
          <Empty>{deleted ? "This account never ran a scan." : "This agency has not run a scan yet."}</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]">
              {scans.map((s) => (
                // The name gets its own line on phones, so it is never cut to a few letters.
                <li key={s.id} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <Link
                      href={`/internal/admin/businesses/${s.businessId}`}
                      className="min-w-0 font-medium break-words text-primary hover:underline sm:truncate"
                      title={s.businessName}
                    >
                      {s.businessName}
                    </Link>
                    <span className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className="text-text-hint tabular-nums">{formatDate(s.at, true)}</span>
                      <ScanStatusBadge status={asStatus(s.status)} />
                    </span>
                  </span>
                  <ScanError error={s.error} clamp />
                </li>
              ))}
            </ul>
            <Link href={`/internal/admin/scans?agency=${agencyId}`} className="w-fit text-[length:calc(13px*var(--px,1))] font-medium text-primary hover:underline">
              See all of this agency&apos;s scans
            </Link>
          </div>
        )}
      </Section>
    </div>
  );
}

// scan_jobs.status holds the same five values the badge knows; anything else reads as waiting.
const asStatus = (status: string): ScanStatus => ((SCAN_STATUSES as readonly string[]).includes(status) ? (status as ScanStatus) : "queued");

export function AgencyRecentSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading recent activity">
      <Skeleton className="h-[calc(88px*var(--px,1))] rounded-md" />
      <Skeleton className="h-[calc(200px*var(--px,1))] rounded-md" />
    </div>
  );
}
