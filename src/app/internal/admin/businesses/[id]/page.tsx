import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { loadBusinessDetail, runScanNow } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { ScanBadge, formatDate } from "../_components/scan-parts";
import AnswersGrid from "./_components/answers-grid";
import { Competitors, Opportunities, Questions } from "./_components/lists";
import Profile from "./_components/profile";
import RunScanButton from "./_components/run-scan-button";
import ScanHistory from "./_components/scan-history";

export const metadata = { title: "Business" };

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
      <Suspense fallback={<DetailSkeleton />}>
        <Detail id={id} />
      </Suspense>
    </div>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Detail({ id }: { id: string }) {
  const detail = UUID.test(id) ? await loadBusinessDetail(id) : null;
  if (!detail) notFound();
  const { business, agency, scans, credits, balance } = detail;
  const last = scans[0];

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold tracking-[-0.02em]">
            <span className="break-words">{business.name}</span>
            {agency?.isTest && <Badge variant="secondary">Test</Badge>}
          </h1>
          <p className="mt-1 text-[14px] break-words text-muted-foreground">
            {agency ? agency.name : "No agency"}
            {detail.ownerEmail && `, ${detail.ownerEmail}`}
          </p>
        </div>
        <RunScanButton
          businessId={business.id}
          active={detail.activeScan}
          canScan={agency !== null}
          runScanNow={runScanNow}
        />
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <Stat label="Last scan">
          {last ? (
            <span className="flex flex-col items-start gap-1">
              <ScanBadge state={last.state} />
              <span className="text-[13px] font-normal text-muted-foreground">{formatDate(last.startedAt, true)}</span>
            </span>
          ) : (
            "Never"
          )}
        </Stat>
        <Stat label="Credits used this month">{credits.thisMonth.toLocaleString("en-US")}</Stat>
        <Stat label="Credits used in total">{credits.allTime.toLocaleString("en-US")}</Stat>
        <Stat label="Agency balance">
          {balance ? (
            <span className="flex flex-col">
              {balance.total.toLocaleString("en-US")}
              {balance.held > 0 && (
                <span className="text-[13px] font-normal text-muted-foreground">
                  {balance.held.toLocaleString("en-US")} held for a scan
                </span>
              )}
            </span>
          ) : (
            "No agency"
          )}
        </Stat>
      </dl>

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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-3">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[20px] font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading business">
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-[84px] rounded-md" />
      <Skeleton className="h-[220px] rounded-md" />
      <Skeleton className="h-[260px] rounded-md" />
    </div>
  );
}
