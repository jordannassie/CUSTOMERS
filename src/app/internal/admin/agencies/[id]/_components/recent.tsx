import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAgencyRecent, SCAN_STATUSES, type ScanStatus } from "@/modules/admin";
import { ScanStatusBadge } from "../../../_components/badges";
import { formatDate, money } from "../../../_components/format";
import ScanError from "../../../_components/scan-error";
import { StatGrid, StatTile } from "../../../_components/stat";
import Section, { Empty } from "../../../businesses/[id]/_components/section";
import { credits } from "../../_components/agency-parts";

/**
 * What the agency spent lately, its newest scans and its Stripe pages (admin review 2026-11-12): until now support had
 * to open the Scans and Usage pages, and Stripe, to see any of it. Streams in after the rest of the page.
 */
export default async function AgencyRecent({ agencyId }: { agencyId: string }) {
  const recent = await loadAgencyRecent(agencyId);
  if (!recent) return null;
  const { lastDays, scans, stripe } = recent;
  return (
    <div className="flex flex-col gap-8">
      <StatGrid label={`Last ${lastDays.days} days`}>
        <StatTile
          label={`Credits used, last ${lastDays.days} days`}
          value={credits(lastDays.credits)}
          note={lastDays.freeCredits > 0 ? `${credits(lastDays.freeCredits)} of them free (trial, promo or admin)` : undefined}
        />
        <StatTile label={`Real AI cost, last ${lastDays.days} days`} value={money(lastDays.costUsd) || "$0.00"} />
        <StatTile label="Last scan" value={scans[0] ? formatDate(scans[0].at) : "None yet"} />
        <StatTile
          label="Stripe"
          value={
            stripe.customerUrl ? (
              <span className="flex flex-col gap-1 text-[length:calc(14px*var(--px,1))] font-medium">
                <StripeLink href={stripe.customerUrl}>Open the customer</StripeLink>
                {stripe.subscriptionUrl && <StripeLink href={stripe.subscriptionUrl}>Open the subscription</StripeLink>}
              </span>
            ) : (
              <span className="text-[length:calc(14px*var(--px,1))] font-normal text-muted-foreground">Not in Stripe yet</span>
            )
          }
        />
      </StatGrid>

      <Section title="Recent scans" note={scans.length > 0 ? "Newest first" : undefined}>
        {scans.length === 0 ? (
          <Empty>This agency has not run a scan yet.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]">
              {scans.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex items-start justify-between gap-3">
                    <Link href={`/internal/admin/businesses/${s.businessId}`} className="min-w-0 truncate font-medium text-primary hover:underline">
                      {s.businessName}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
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

function StripeLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      {children}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens Stripe in a new tab)</span>
    </a>
  );
}

export function AgencyRecentSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading recent activity">
      <Skeleton className="h-[calc(88px*var(--px,1))] rounded-md" />
      <Skeleton className="h-[calc(200px*var(--px,1))] rounded-md" />
    </div>
  );
}
