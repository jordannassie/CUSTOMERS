import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { loadBusinessDetail, loadBusinessName, runScanNow, restoreBusiness } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { ScanStatusBadge, TestBadge } from "../../_components/badges";
import AdminPageHeader from "../../_components/page-header";
import { DetailSkeleton } from "../../_components/skeletons";
import { StatGrid, StatTile } from "../../_components/stat";
import { DeletedBadge } from "../_components/scan-parts";
import { formatDate } from "../../_components/format";
import AnswersGrid from "./_components/answers-grid";
import { Competitors, Opportunities, Questions } from "./_components/lists";
import Profile from "./_components/profile";
import RestoreBusiness from "./_components/restore-business";
import RunScanButton from "./_components/run-scan-button";
import ScanHistory from "./_components/scan-history";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Joe's Coffee | Admin" through the admin title template, so open tabs say which business they are.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: (UUID.test(id) && (await loadBusinessName(id))) || "Business" };
}

export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin({ next: `/internal/admin/businesses/${id}` });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Link
        href="/internal/admin/businesses"
        className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Businesses
      </Link>
      <Suspense fallback={<DetailSkeleton label="Loading business" />}>
        <Detail id={id} />
      </Suspense>
    </div>
  );
}

async function Detail({ id }: { id: string }) {
  const detail = UUID.test(id) ? await loadBusinessDetail(id) : null;
  if (!detail) notFound();
  const { business, agency, scans, credits, balance } = detail;
  const last = scans[0];

  return (
    <>
      <AdminPageHeader
        title={
          <>
            <span className="min-w-0 break-words">{business.name}</span>
            {business.deleted_at && <DeletedBadge />}
            {agency?.isTest && <TestBadge />}
          </>
        }
        subtitle={
          <p>
            {agency ? (
              <Link href={`/internal/admin/agencies/${agency.id}`} className="text-primary hover:underline">
                {agency.name}
              </Link>
            ) : (
              "No agency"
            )}
            {detail.ownerEmail && `, ${detail.ownerEmail}`}
          </p>
        }
        actions={
          <RunScanButton
            businessId={business.id}
            active={detail.activeScan}
            blocked={
              business.deleted_at
                ? "This business was deleted, so it can't be scanned."
                : agency === null
                  ? "No agency, so there are no credits to scan with."
                  : null
            }
            credits={detail.questions.filter((q) => q.active).length * business.models.length}
            agencyName={agency?.name ?? null}
            runScanNow={runScanNow}
          />
        }
      />

      {business.deleted_at && (
        <RestoreBusiness
          businessId={business.id}
          blocked={
            agency?.status === "deleted"
              ? "The whole account was deleted. Restore the account first."
              : !business.purge_after || new Date(business.purge_after) <= new Date()
                ? "The waiting period has passed, so this business can no longer be restored."
                : null
          }
          restoreBusiness={restoreBusiness}
        />
      )}

      <StatGrid>
        <StatTile
          label="Last scan"
          value={last ? <ScanStatusBadge status={last.state} /> : "Never"}
          note={last ? formatDate(last.startedAt, true) : undefined}
        />
        <StatTile label="Credits used this month" value={credits.thisMonth.toLocaleString("en-US")} />
        <StatTile label="Credits used in total" value={credits.allTime.toLocaleString("en-US")} />
        <StatTile
          label="Agency balance"
          value={balance ? balance.total.toLocaleString("en-US") : "No agency"}
          note={balance && balance.held > 0 ? `${balance.held.toLocaleString("en-US")} held for a scan` : undefined}
        />
      </StatGrid>

      <Profile detail={detail} />
      <AnswersGrid results={detail.results} models={business.models} />
      <ScanHistory scans={scans} />
      <div className="grid gap-8 lg:grid-cols-2">
        <Questions questions={detail.questions} />
        <Competitors competitors={detail.competitors} />
      </div>
      <Opportunities opportunities={detail.opportunities} />
    </>
  );
}
