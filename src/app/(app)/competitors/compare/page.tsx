import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { ShowGoogle } from "@/components/app/ShowGoogle";
import { CompareTabs } from "@/components/competitors/compare/CompareTabs";
import { Trend } from "@/components/competitors/compare/PairTrend";
import { Picker } from "@/components/competitors/compare/Picker";
import { QuestionsTab, WhereLookedTab } from "@/components/competitors/compare/QuestionsTab";
import { GoogleReasons } from "@/components/competitors/compare/GoogleReasons";
import { LeadCards, ReasonCards } from "@/components/competitors/compare/ReasonCards";
import { Scorecard } from "@/components/competitors/compare/Scorecard";
import { toCompareTab } from "@/components/competitors/compare/tabs";
import { WebsitesTab } from "@/components/competitors/compare/WebsitesTab";
import { GoogleTable } from "@/components/competitors/GoogleCompare";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { compareHref } from "@/lib/compare-href";
import { siteHref } from "@/lib/site-href";
import { checkCompetitorWebsite, getComparePage, saveCompetitorWebsite, trackCompetitor } from "@/modules/competitors";
import { actionStates, addToActions, moveActionTo } from "@/modules/opportunities";
import { getNextScan } from "@/modules/overview";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Compare", robots: { index: false } };

const ID = /^[0-9a-f-]{36}$/i;

/** The reasons heading says what the standing is: "Why they are ahead" only when they are (audit, 2026-10-28). */
function reasonsHeading(standing: string | null, collecting: boolean): string {
  if (collecting) return "Where they beat you so far";
  if (standing === "behind") return "Why they are ahead";
  if (standing === "ahead") return "Where they still beat you";
  return "Where they beat you";
}
const GOOGLE_KEYS = ["google:reviews", "google:rating", "google:hours", "google:category"];

// Compare (dashboard redesign, 2026-10-27): you against one competitor at a time, every fact with its fix.
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ with?: string; tab?: string; google?: string }> }) {
  const params = await searchParams;
  const competitorId = params.with && ID.test(params.with) ? params.with : null;
  const tab = toCompareTab(params.tab);
  const workspace = await getWorkspace({ next: compareHref(competitorId, tab) });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");
  // The next scan's day, for the one-scan trend's note.
  const [page, nextScan] = await Promise.all([getComparePage(business.id, competitorId), getNextScan(business.id, compareHref(competitorId, tab))]);
  if (!page) redirect("/competitors");
  const data = page.selected;
  // Google is asked about the two of you only after "Show Google details" (?google=1), on the Google tab: its table and
  // the Google reasons with their fixes (2026-10-27; no longer repeated on the Summary tab).
  const signals = data && params.google === "1" ? data.loadSignals() : null;
  const askGoogle = (t: string) => `${compareHref(data?.panel.competitorId, t)}&google=1`;
  // Once their website is checked, the button opens it; before, it goes to the Website tab to check it.
  const visit = data?.panel.website.checked ? siteHref(data.panel.website.domain) : null;
  const keys = data ? data.cards.map((c) => c.key) : [];
  const [states, googleStates] = data
    ? await Promise.all([actionStates(business.id, keys), actionStates(business.id, GOOGLE_KEYS)]).then(([a, b]) => [Object.fromEntries(a), Object.fromEntries(b)])
    : [{}, {}];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6" data-testid="compare-page">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              Compare <SampleDataBadge show={workspace.account?.isTest} />
            </span>
          }
          description="Pick a competitor to see the facts behind every gap, and what to do about each one."
          actions={
            data ? (
              <Button asChild variant="outline">
                {visit ? (
                  <a href={visit} target="_blank" rel="noopener noreferrer">
                    <Globe aria-hidden="true" />
                    Their website
                    <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  <Link href={compareHref(data.panel.competitorId, "website")}>
                    <Globe aria-hidden="true" />
                    Check their website
                  </Link>
                )}
              </Button>
            ) : undefined
          }
        />

        {page.options.length === 0 || !data ? (
          <section className="rounded-md border border-border bg-surface p-5" data-testid="compare-empty">
            <h2 className="text-base font-semibold">Track a competitor to compare</h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Add the businesses you compete with, or track one AI already names. Their facts show here after your next scan.
            </p>
            <Button asChild className="mt-3 w-fit">
              <Link href="/competitors/manage">Add competitors</Link>
            </Button>
          </section>
        ) : (
          <>
            <Picker page={page} tab={tab} track={trackCompetitor} />
            <Card>
              <CardContent className="flex flex-col gap-6">
                <Scorecard data={data} />
                <Trend name={data.title} trend={data.trend} color={data.color} firstScan={data.firstScan} nextScan={nextScan} />
              </CardContent>
            </Card>
            <CompareTabs
              key={data.panel.competitorId}
              initial={tab}
              panels={{
                summary: (
                  <div className="flex flex-col gap-8" data-testid="tab-summary">
                    <section className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold">{reasonsHeading(data.standing, data.collecting)}</h3>
                        <p className="text-xs text-muted-foreground">Facts from AI answers in the last 30 days and what we read, biggest first. Each comes with its fix.</p>
                      </div>
                      <ReasonCards
                        name={data.title}
                        businessId={business.id}
                        cards={data.cards}
                        states={states}
                        add={addToActions}
                        move={moveActionTo}
                        answers={data.panel.why.answers}
                        standing={data.collecting ? null : data.standing}
                      />
                    </section>
                    {/* When you lead, where you are ahead comes first. */}
                    <section className={cn("flex flex-col gap-3", data.standing === "ahead" && "order-first")}>
                      <h3 className="text-sm font-semibold">Where you are ahead</h3>
                      <LeadCards leads={data.leads} standing={data.collecting ? null : data.standing} />
                    </section>
                    <p className="text-xs text-text-hint">We can&apos;t see inside the AI tools, so these are likely reasons, each backed by the facts shown.</p>
                  </div>
                ),
                questions: <QuestionsTab panel={data.panel} />,
                sources: <WhereLookedTab panel={data.panel} />,
                website: (
                  <WebsitesTab panel={data.panel} businessId={business.id} actions={{ check: checkCompetitorWebsite, save: saveCompetitorWebsite }} />
                ),
                google: (
                  <div data-testid="tab-google">
                    {signals ? (
                      <div className="flex flex-col gap-6">
                        {/* The table stays narrow so the two columns sit close; the fix cards below use the full width. */}
                        <div className="max-w-xl">
                          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                            <GoogleTable name={data.branch} competitorId={data.panel.competitorId} signals={signals} />
                          </Suspense>
                        </div>
                        {/* Where they beat you on Google, each with its fix: only here, not again on the Summary tab. */}
                        <Suspense fallback={null}>
                          {/* One listing's Google values: the tracked branch's name, never "(all locations)". */}
                          <GoogleReasons
                            name={data.branch}
                            competitorId={data.panel.competitorId}
                            businessId={business.id}
                            signals={signals}
                            states={googleStates}
                            add={addToActions}
                            move={moveActionTo}
                            fixes={data.panel.fixRefs}
                          />
                        </Suspense>
                      </div>
                    ) : (
                      <ShowGoogle href={askGoogle("google")} text="Your Google listing next to theirs: reviews, rating, opening days and category, live from Google." />
                    )}
                  </div>
                ),
              }}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
