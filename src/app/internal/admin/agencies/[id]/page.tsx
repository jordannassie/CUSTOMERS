import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import {
  adjustCredits,
  adminStripeConnected,
  extendTrial,
  loadAgencyDetail,
  loadAgencyName,
  markAgencyTest,
  MAX_CREDIT_CHANGE,
  MAX_TRIAL_DAYS,
  restoreAgency,
  suspendAgency,
  unsuspendAgency,
} from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { requestNow } from "@/lib/request-now";
import { formatDate } from "../../_components/format";
import { TestBadge } from "../../_components/badges";
import AdminPageHeader from "../../_components/page-header";
import { DetailSkeleton } from "../../_components/skeletons";
import { StatGrid, StatTile } from "../../_components/stat";
import { StatusBadge, credits } from "../_components/agency-parts";
import AgencyActions from "./_components/agency-actions";
import AgencyRecent, { AgencyRecentSkeleton } from "./_components/recent";
import { AuditLog, Businesses, CancelReasons, CreditHistory } from "./_components/history";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Acme Agency | Admin" through the admin title template, so open tabs say which agency they are.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: (UUID.test(id) && (await loadAgencyName(id))) || "Agency" };
}

const ACTIONS = { adjustCredits, extendTrial, suspendAgency, unsuspendAgency, restoreAgency, markAgencyTest };

export default async function AdminAgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin({ next: `/internal/admin/agencies/${id}` });

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
      <Link
        href="/internal/admin/agencies"
        className="inline-flex w-fit items-center gap-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Agencies
      </Link>
      <Suspense fallback={<DetailSkeleton label="Loading agency" />}>
        <Detail id={id} />
      </Suspense>
    </div>
  );
}

async function Detail({ id }: { id: string }) {
  const detail = UUID.test(id) ? await loadAgencyDetail(id) : null;
  if (!detail) notFound();
  const { agency, balance, stripe } = detail;
  const deleted = agency.status === "deleted";

  return (
    <>
      <AdminPageHeader
        title={
          <>
            <span className="min-w-0 break-words">{agency.name}</span>
            <StatusBadge status={agency.displayStatus} />
            {agency.isTest && <TestBadge />}
          </>
        }
        subtitle={
          <p>
            {detail.ownerEmail ?? "Owner email unknown"}, signed up {formatDate(agency.createdAt)}
          </p>
        }
      />

      <StatGrid>
        {/* Left on the plan grants: a mid-month upgrade grants a prorated amount, and scans use them, so it is rarely the
            plan total. Credit changes below lists every grant and expiry (QA round 2, item 8). */}
        <StatTile
          label="Plan credits left"
          value={credits(balance.plan)}
          note={balance.held > 0 ? `${credits(balance.held)} held for a scan that is running` : undefined}
        >
          <a href="#section-credit-changes" className="inline-flex min-h-6 items-center text-xs text-primary hover:underline">
            See every grant and expiry
          </a>
        </StatTile>
        <StatTile label="Top-up credits left" value={credits(balance.topup)} />
        <StatTile label="Overdrawn" value={credits(balance.overdraft)} tone={balance.overdraft > 0 ? "bad" : undefined} />
        {/* The badge says Deleted; this tile says when, and until when it can come back (admin audit 2026-11-12). */}
        {deleted ? (
          <StatTile
            label="Deleted on"
            value={agency.deletedAt ? formatDate(agency.deletedAt) : "Date not saved"}
            note={
              agency.restoreUntil
                ? agency.canRestore
                  ? `Can be restored until ${formatDate(agency.restoreUntil)}`
                  : `Could be restored until ${formatDate(agency.restoreUntil)}`
                : undefined
            }
          />
        ) : (
          <StatTile
            label={agency.displayStatus === "trial_ended" ? "Trial ended" : agency.status === "trialing" ? "Trial ends" : "Renews"}
            value={
              agency.status === "trialing"
                ? agency.trialEndsAt ? formatDate(agency.trialEndsAt) : "Not set"
                : agency.status === "canceled"
                  ? "No, plan ended"
                  : agency.currentPeriodEnd ? formatDate(agency.currentPeriodEnd) : "Not set"
            }
          />
        )}
      </StatGrid>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_calc(360px*var(--px,1))] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <Suspense fallback={<AgencyRecentSkeleton />}>
            <AgencyRecent agencyId={agency.id} deleted={deleted} />
          </Suspense>
          <Businesses rows={detail.businesses} agencyStatus={agency.displayStatus} now={requestNow()} />
          <CancelReasons rows={detail.cancelReasons} />
          <AuditLog rows={detail.audit} />
          <CreditHistory rows={detail.ledger} />
        </div>
        <aside aria-label="Actions" className="order-first flex flex-col gap-2 lg:sticky lg:top-6 lg:order-none">
          <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">Actions</h2>
          <AgencyActions
            agency={agency}
            stripeConnected={adminStripeConnected()}
            maxCredits={MAX_CREDIT_CHANGE}
            maxTrialDays={MAX_TRIAL_DAYS}
            actions={ACTIONS}
          />
          {stripe.customerUrl ? (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[length:calc(13px*var(--px,1))] font-medium">
              <StripeLink href={stripe.customerUrl}>Customer in Stripe</StripeLink>
              {stripe.subscriptionUrl && <StripeLink href={stripe.subscriptionUrl}>Subscription in Stripe</StripeLink>}
            </p>
          ) : (
            <p className="text-[length:calc(12px*var(--px,1))] text-text-hint">
              {deleted ? "This account was never linked to Stripe." : "Not linked to Stripe yet."}
            </p>
          )}
          <p className="text-[length:calc(12px*var(--px,1))] text-text-hint">Every action is saved in the admin log.</p>
        </aside>
      </div>
    </>
  );
}

function StripeLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      {children}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens Stripe in a new tab)</span>
    </a>
  );
}
