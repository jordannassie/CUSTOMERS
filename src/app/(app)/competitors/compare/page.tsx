import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { ShowGoogle } from "@/components/app/ShowGoogle";
import { AiMessage, CheckInLayout, FollowUps, UserBubble } from "@/components/checkin";
import { ByAi } from "@/components/competitors/compare/ByAi";
import { CompareTabs } from "@/components/competitors/compare/CompareTabs";
import { GoogleRail, GoogleRailPrompt } from "@/components/competitors/compare/GoogleRail";
import { HeadToHead } from "@/components/competitors/compare/HeadToHead";
import { Picker } from "@/components/competitors/compare/Picker";
import { QuestionsTab, WhereLookedTab } from "@/components/competitors/compare/QuestionsTab";
import { GoogleReasons } from "@/components/competitors/compare/GoogleReasons";
import { LeadCards, ReasonCards } from "@/components/competitors/compare/ReasonCards";
import { toCompareTab, type CompareTab } from "@/components/competitors/compare/tabs";
import { WebsiteCard } from "@/components/competitors/compare/WebsiteCard";
import { WebsitesTab } from "@/components/competitors/compare/WebsitesTab";
import { GoogleTable } from "@/components/competitors/GoogleCompare";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
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

/** Check-in: the serif lead over the tabbed message, one per tab. */
function tabLeads(standing: string | null, collecting: boolean): Record<CompareTab, string> {
  return {
    summary:
      !collecting && standing === "behind" ? "Here's how to close it, biggest first:" : `${reasonsHeading(standing, collecting)}, biggest first:`,
    questions: "Here's how each customer question went for the two of you.",
    sources: "Here's where AI looked for each of you.",
    website: "Here's what each website gives AI.",
    google: "Here's how the two of you look on Google.",
  };
}
const GOOGLE_KEYS = ["google:reviews", "google:rating", "google:hours", "google:category"];

// Compare (dashboard redesign, 2026-10-27): you against one competitor at a time, every fact with its fix.
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ with?: string; tab?: string; google?: string }> }) {
  const params = await searchParams;
  const competitorId = params.with && ID.test(params.with) ? params.with : null;
  const tab = toCompareTab(params.tab);
  const workspace = await getWorkspace({
    next: compareHref(competitorId, tab),
  });
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
    ? await Promise.all([actionStates(business.id, keys), actionStates(business.id, GOOGLE_KEYS)]).then(([a, b]) => [
        Object.fromEntries(a),
        Object.fromEntries(b),
      ])
    : [{}, {}];

  const header = (
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
  );

  if (page.options.length === 0 || !data) {
    return (
      <div data-testid="compare-page">
        <CheckInLayout>
          {header}
          <section className="rounded-xl bg-card p-6" data-testid="compare-empty">
            <h2 className="font-display text-[22px] font-semibold">Track a competitor to compare</h2>
            <p className="mt-2 max-w-prose text-[15px] text-muted-foreground">
              Add the businesses you compete with, or track one AI already names. Their facts show here after your next scan.
            </p>
            <Button asChild className="mt-4 w-fit">
              <Link href="/competitors/manage">Add competitors</Link>
            </Button>
          </section>
        </CheckInLayout>
      </div>
    );
  }

  const rail = (
    <>
      <Picker page={page} tab={tab} track={trackCompetitor} ownDomain={business.domain} />
      {signals ? (
        <Suspense fallback={<Skeleton className="h-44 w-full rounded-xl bg-surface" />}>
          <GoogleRail name={data.branch} competitorId={data.panel.competitorId} signals={signals} />
        </Suspense>
      ) : (
        <GoogleRailPrompt href={askGoogle("google")} />
      )}
    </>
  );

  return (
    <div data-testid="compare-page">
      <CheckInLayout rail={rail} railLabel="Pick a competitor">
        {header}
        <UserBubble>How do I compare with {data.title}?</UserBubble>
        <HeadToHead data={data} nextScan={nextScan} />
        <ByAi data={data} index={1} />
        <WebsiteCard name={data.title} website={data.panel.website} index={2} />
        <AiMessage place="last" index={3}>
          <CompareTabs
            key={data.panel.competitorId}
            initial={tab}
            leads={tabLeads(data.standing, data.collecting)}
            panels={{
              summary: (
                <div className="flex flex-col gap-7" data-testid="tab-summary">
                  <section className="flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-[15px] font-semibold">{reasonsHeading(data.standing, data.collecting)}</h3>
                      <p className="text-[13px] text-muted-foreground">
                        Facts from AI answers in the last 30 days and what we read, biggest first. Each comes with its fix.
                      </p>
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
                    <h3 className="text-[15px] font-semibold">Where you are ahead</h3>
                    <LeadCards leads={data.leads} standing={data.collecting ? null : data.standing} />
                  </section>
                  <p className="text-xs text-muted-foreground">
                    We can&apos;t see inside the AI tools, so these are likely reasons, each backed by the facts shown.
                  </p>
                </div>
              ),
              questions: <QuestionsTab panel={data.panel} />,
              sources: <WhereLookedTab panel={data.panel} />,
              website: (
                <WebsitesTab
                  panel={data.panel}
                  businessId={business.id}
                  actions={{
                    check: checkCompetitorWebsite,
                    save: saveCompetitorWebsite,
                  }}
                />
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
                        {/* One listing's Google values: the tracked branch's name. */}
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
                    <ShowGoogle
                      href={askGoogle("google")}
                      text="Your Google listing next to theirs: reviews, rating, opening days and category, live from Google."
                    />
                  )}
                </div>
              ),
            }}
          />
        </AiMessage>
        <FollowUps
          items={[
            { label: "Who's ahead of me, and why?", href: "/competitors" },
            { label: "Where does AI look?", href: "/sources" },
            { label: "What should I fix first?", href: "/actions" },
          ]}
        />
      </CheckInLayout>
    </div>
  );
}
