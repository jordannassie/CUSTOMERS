import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adjustCredits,
  adminStripeConnected,
  extendTrial,
  loadAgencyDetail,
  markAgencyTest,
  MAX_CREDIT_CHANGE,
  MAX_TRIAL_DAYS,
  restoreAgency,
  suspendAgency,
  unsuspendAgency,
} from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { formatDate } from "../../businesses/_components/scan-parts";
import { StatusBadge, TestBadge, credits } from "../_components/agency-parts";
import AgencyActions from "./_components/agency-actions";
import { AuditLog, Businesses, CreditHistory } from "./_components/history";

export const metadata = { title: "Agency" };

const ACTIONS = { adjustCredits, extendTrial, suspendAgency, unsuspendAgency, restoreAgency, markAgencyTest };

export default async function AdminAgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin({ next: `/internal/admin/agencies/${id}` });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Link
        href="/internal/admin/agencies"
        className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Agencies
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <Detail id={id} />
      </Suspense>
    </div>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Detail({ id }: { id: string }) {
  const detail = UUID.test(id) ? await loadAgencyDetail(id) : null;
  if (!detail) notFound();
  const { agency, balance } = detail;

  return (
    <>
      <header className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold tracking-[-0.02em]">
          <span className="break-words">{agency.name}</span>
          <StatusBadge status={agency.status} />
          {agency.isTest && <TestBadge />}
        </h1>
        <p className="mt-1 text-[14px] break-words text-muted-foreground">
          {detail.ownerEmail ?? "Owner email unknown"}, signed up {formatDate(agency.createdAt)}
        </p>
        {agency.restoreUntil && (
          <p className="mt-2 text-[14px] text-low-text">
            {agency.canRestore
              ? `Deleted. Can be restored until ${formatDate(agency.restoreUntil)}.`
              : "Deleted more than 30 days ago."}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <Stat label="Plan credits left">{credits(balance.plan)}</Stat>
        <Stat label="Top-up credits left">{credits(balance.topup)}</Stat>
        <Stat label="Overdrawn">
          <span className={balance.overdraft > 0 ? "text-low-text" : undefined}>{credits(balance.overdraft)}</span>
        </Stat>
        <Stat label={agency.status === "trialing" ? "Trial ends" : "Renews"}>
          {agency.status === "trialing"
            ? agency.trialEndsAt ? formatDate(agency.trialEndsAt) : "Not set"
            : agency.currentPeriodEnd ? formatDate(agency.currentPeriodEnd) : "Not set"}
        </Stat>
      </dl>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <Businesses rows={detail.businesses} />
          <AuditLog rows={detail.audit} />
          <CreditHistory rows={detail.ledger} />
        </div>
        <aside aria-label="Actions" className="flex flex-col gap-2 lg:sticky lg:top-6">
          <h2 className="text-[16px] font-semibold">Actions</h2>
          <AgencyActions
            agency={agency}
            stripeConnected={adminStripeConnected()}
            maxCredits={MAX_CREDIT_CHANGE}
            maxTrialDays={MAX_TRIAL_DAYS}
            actions={ACTIONS}
          />
          <p className="text-[12px] text-text-hint">
            {agency.stripeLinked ? "Linked to Stripe." : "Not linked to Stripe yet."} Every action is saved in the admin log.
          </p>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-3">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[18px] font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading agency">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 rounded-md" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    </div>
  );
}
