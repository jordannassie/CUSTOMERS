import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { AnswersTab } from "@/components/competitors/compare/AnswersTab";
import { CompareTabs } from "@/components/competitors/compare/CompareTabs";
import { isCompareTab, type CompareTab } from "@/components/competitors/compare/tabs";
import { FixesTab } from "@/components/competitors/compare/FixesTab";
import { GapAreas } from "@/components/competitors/compare/Gap";
import { HeadToHead } from "@/components/competitors/compare/HeadToHead";
import { WebsitesTab } from "@/components/competitors/compare/WebsitesTab";
import { WhyTab } from "@/components/competitors/compare/WhyTab";
import { GoogleTable } from "@/components/competitors/GoogleCompare";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { checkCompetitorWebsite, getComparison, saveCompetitorWebsite, STANDING_TEXT } from "@/modules/competitors";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Compare", robots: { index: false } };

const ID = /^[0-9a-f-]{36}$/i;
const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;

// "Bean House vs you" (B-93): one competitor against the business, each fact once, in tabs with their own address.
export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  if (!ID.test(id)) notFound();
  const workspace = await getWorkspace({ next: `/competitors/${id}` });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");
  const data = await getComparison(business.id, id);
  // Another business's competitor (after switching business), or one that was removed.
  if (!data) redirect("/competitors");
  const active: CompareTab = isCompareTab(tab) ? tab : "why";
  const { panel } = data;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8" data-testid="compare-page">
      <div className="flex flex-col gap-2">
        <Link href="/competitors" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Competitors
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{data.title} vs you</h1>
          {data.standing && <Badge variant={STANDING_BADGE[data.standing]}>{STANDING_TEXT[data.standing]}</Badge>}
          <SampleDataBadge show={workspace.account?.isTest} />
        </div>
        {data.note && (
          <p className="text-sm text-muted-foreground" data-testid="why-chain-note">
            {data.note}. AI named the chain, so these numbers cover all its locations.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6">
          <HeadToHead name={panel.why.name} them={panel.why.them} you={panel.why.you} answers={panel.why.answers} trend={data.trend} />
          <GapAreas why={panel.why} competitorId={panel.competitorId} signals={data.signals} layout="grid" />
        </CardContent>
      </Card>

      {/* Every tab is built once here, so switching between them is instant. */}
      <CompareTabs
        initial={active}
        panels={{
          why: <WhyTab panel={panel} signals={data.signals} />,
          answers: <AnswersTab panel={panel} />,
          websites: <WebsitesTab panel={panel} businessId={data.businessId} actions={{ check: checkCompetitorWebsite, save: saveCompetitorWebsite }} />,
          google: (
            <div className="max-w-xl" data-testid="tab-google">
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <GoogleTable name={panel.why.name} competitorId={panel.competitorId} signals={data.signals} />
              </Suspense>
            </div>
          ),
          fixes: <FixesTab panel={panel} />,
        }}
      />
    </div>
  );
}
