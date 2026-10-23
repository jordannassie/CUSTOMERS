import { Suspense } from "react";
import Link from "next/link";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { notFound, redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { AlsoRecommended } from "@/components/competitors/AlsoRecommended";
import { Leaderboard } from "@/components/competitors/Leaderboard";
import { SignalsTable } from "@/components/competitors/SignalsTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { answersText, getCompetitorsPage, saveCompetitorWebsite, trackCompetitor, type SignalRow } from "@/modules/competitors";
import { getWorkspace } from "@/modules/workspace";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata = { title: "Competitors", robots: { index: false } };

const PATH = "/competitors";
const MANAGE = "/competitors/manage";

// B-50, MVP_SPEC 8.1: who AI picks more, how you compare on Google, and who else AI names.
export default async function CompetitorsPage() {
  const workspace = await getWorkspace({ next: PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const page = await getCompetitorsPage(business.id, PATH);
  if (!page) notFound();
  const { view } = page;
  const tracked = view.limit === null ? `${view.count} tracked` : `${view.count} of ${view.limit} tracked`;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8">
      <PageHeader
        title={
          <>
            Competitors <SampleDataBadge show={workspace.account?.isTest} />
          </>
        }
        description="How often AI picks you vs competitors over the last 30 days."
        actions={
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
            <Button asChild variant="outline">
              <Link href={MANAGE}>
                <Settings2 aria-hidden />
                Manage list
              </Link>
            </Button>
            <span className="text-[13px] tabular-nums text-muted-foreground" data-testid="tracked-count">
              {tracked}
            </span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who AI recommends most</CardTitle>
            <CardDescription>Share of customer questions where each business was recommended.</CardDescription>
          </CardHeader>
          <CardContent>
            {view.count === 0 ? (
              <Empty
                text="Add the businesses you compete with to see who AI recommends more often."
                action={{ href: MANAGE, label: "Add competitors" }}
              />
            ) : !view.hasScore ? (
              <Empty
                text="Scores appear after your first scan. Run one from the Overview. Results take about a minute."
                action={{ href: "/dashboard", label: "Go to Overview" }}
              />
            ) : (
              <Leaderboard view={view} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Also recommended by AI</CardTitle>
            <CardDescription>Businesses AI named that you do not track yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlsoRecommended
              businessId={business.id}
              names={view.also.map((n) => ({ ...n, text: answersText(n.answers, view.answers) }))}
              answers={view.answers}
              track={trackCompetitor}
              manageHref={MANAGE}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Side by side on Google</CardTitle>
          <CardDescription>What customers and AI see about each business on Google.</CardDescription>
        </CardHeader>
        <CardContent>
          {view.count === 0 ? (
            <Empty text="Add competitors to compare your Google reviews, ratings and hours with theirs." />
          ) : (
            // Google answers last: the rest of the page shows without waiting for them.
            <Suspense fallback={<SignalsLoading rows={view.count + 1} />}>
              <GoogleSignals rows={page.signals} pickBranch={view.pickBranch} businessId={business.id} />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function GoogleSignals({ rows, pickBranch, businessId }: { rows: Promise<SignalRow[]>; pickBranch: boolean; businessId: string }) {
  return <SignalsTable rows={await rows} pickBranch={pickBranch} edit={{ businessId, save: saveCompetitorWebsite }} />;
}

function SignalsLoading({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading Google ratings and hours" data-testid="signals-loading">
      {Array.from({ length: Math.min(rows, 6) }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-start gap-4 py-4" data-testid="empty-state">
      <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
      {action ? (
        <Button asChild size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
