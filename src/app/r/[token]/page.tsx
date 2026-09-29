import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Report } from "@/components/report/Report";
import { Skeleton } from "@/components/ui/skeleton";
import { getSharedReport, isShareLinkActive } from "@/modules/reports";
import { InactiveReport } from "./not-found";

// No links into the app and nothing indexed. no-referrer keeps the token out of Referer headers when a
// reader opens a competitor's website from the report.
export const metadata: Metadata = {
  title: "AI visibility report",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
  openGraph: null,
  twitter: null,
};

// Blocks on the share lookup so a turned-off link can answer 404 before anything streams.
export const instant = false;

type Props = { params: Promise<{ token: string }> };

// B-59, MVP_SPEC 8.3: the read-only report behind a share link, no login needed.
export default async function SharedReportPage({ params }: Props) {
  // A turned-off link must stop working at once, so this page is never cached.
  await connection();
  // Checked before anything streams, so a turned-off or unknown link answers 404 and is not indexed.
  if (!(await isShareLinkActive((await params).token))) notFound();
  return (
    <main className="flex-1 bg-background print:bg-white">
      <Suspense fallback={<ReportSkeleton />}>
        <SharedReport params={params} />
      </Suspense>
    </main>
  );
}

async function SharedReport({ params }: Props) {
  const { token } = await params;
  const report = await getSharedReport(token);
  if (!report) return <InactiveReport />;
  return <Report report={report} logoSrc={report.agency.hasLogo ? `/r/${token}/logo` : null} />;
}

function ReportSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-48" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="flex items-center gap-7">
        <Skeleton className="size-36 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-full max-w-sm" />
        </div>
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
