import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
import { formatDate } from "../../_components/format";
import { TestBadge } from "../../_components/badges";
import AdminPageHeader from "../../_components/page-header";
import { DetailSkeleton } from "../../_components/skeletons";
import { StatGrid, StatTile } from "../../_components/stat";
import { StatusBadge, credits } from "../_components/agency-parts";
import AgencyActions from "./_components/agency-actions";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Link
        href="/internal/admin/agencies"
        className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
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
  const { agency, balance } = detail;

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
          <>
            <p>
              {detail.ownerEmail ?? "Owner email unknown"}, signed up {formatDate(agency.createdAt)}
            </p>
            {agency.restoreUntil && (
              <p className="mt-2 text-low-text">
                {agency.canRestore
                  ? `Deleted. Can be restored until ${formatDate(agency.restoreUntil)}.`
                  : "Deleted more than 30 days ago."}
              </p>
            )}
          </>
        }
      />

      <StatGrid>
        <StatTile label="Plan credits left" value={credits(balance.plan)} />
        <StatTile label="Top-up credits left" value={credits(balance.topup)} />
        <StatTile label="Overdrawn" value={credits(balance.overdraft)} tone={balance.overdraft > 0 ? "bad" : undefined} />
        <StatTile
          label={agency.displayStatus === "trial_ended" ? "Trial ended" : agency.status === "trialing" ? "Trial ends" : "Renews"}
          value={
            agency.status === "trialing"
              ? agency.trialEndsAt ? formatDate(agency.trialEndsAt) : "Not set"
              : agency.status === "deleted"
                ? "No, account deleted"
                : agency.status === "canceled"
                  ? "No, plan ended"
                  : agency.currentPeriodEnd ? formatDate(agency.currentPeriodEnd) : "Not set"
          }
        />
      </StatGrid>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <Businesses rows={detail.businesses} />
          <CancelReasons rows={detail.cancelReasons} />
          <AuditLog rows={detail.audit} />
          <CreditHistory rows={detail.ledger} />
        </div>
        <aside aria-label="Actions" className="order-first flex flex-col gap-2 lg:sticky lg:top-6 lg:order-none">
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
