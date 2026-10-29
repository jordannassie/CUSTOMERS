import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { ListedFirst } from "@/components/sources/ListedFirst";
import { OwnSiteStatus } from "@/components/sources/OwnSiteStatus";
import { SitesTable } from "@/components/sources/SitesTable";
import { SourcesEmpty } from "@/components/sources/SourcesEmpty";
import { SourcesKpis } from "@/components/sources/SourcesKpis";
import { SourceTypes } from "@/components/sources/SourceTypes";
import { ToolFilter } from "@/components/sources/ToolFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addToActions } from "@/modules/opportunities";
import { TOOL_LABELS, getSources, toolFromParam } from "@/modules/sources";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Sources", robots: { index: false } };

type Props = { searchParams: Promise<{ tool?: string | string[] }> };

// B-54, MVP_SPEC 8.1, dashboard redesign (2026-10-27): the websites AI used for this business's questions, which of
// them skip the business, and where to get listed first. ?tool= filters every number to one AI tool.
export default async function SourcesPage({ searchParams }: Props) {
  const workspace = await getWorkspace({ next: "/sources" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const tool = toolFromParam((await searchParams).tool);
  const sources = await getSources(business.id, tool);
  if (!sources) notFound();
  const where = sources.place ? ` in ${sources.place}` : "";
  const toolLabel = tool ? TOOL_LABELS[tool] : null;
  const paused = business.status === "paused";
  const answers = `${sources.answers} ${sources.answers === 1 ? "answer" : "answers"}`;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={
            <>
              Sources <SampleDataBadge show={workspace.account?.isTest} />
            </>
          }
          description={
            <>
              Websites AI used in the last 30 days to answer customer questions{where}. Being listed on them helps AI
              recommend you.
            </>
          }
          actions={sources.answersAllTools > 0 ? <ToolFilter tool={tool} /> : undefined}
        />

        {paused && sources.answersAllTools > 0 && (
          <p className="rounded-md border border-border bg-surface px-4 py-3.5 text-sm text-muted-foreground" data-testid="scans-paused">
            Scans are paused for this business, so these numbers stay as they are until scans start again.{" "}
            <Link href="/settings/billing" className="font-medium text-primary hover:underline">
              Go to Billing
            </Link>
          </p>
        )}

        {sources.answersAllTools === 0 ? (
          paused ? (
            <SourcesEmpty testId="scans-paused" title="Scans are paused">
              This business has no answers in the last 30 days because its scans are paused. Turn them back on in Billing.
              <Button asChild className="mt-4 w-fit">
                <Link href="/settings/billing">Go to Billing</Link>
              </Button>
            </SourcesEmpty>
          ) : (
            <SourcesEmpty testId="no-scans" title="No scans yet">
              Run your first scan from the Overview to see which websites AI uses.
              <Button asChild className="mt-4 w-fit">
                <Link href="/dashboard">Go to Overview</Link>
              </Button>
            </SourcesEmpty>
          )
        ) : sources.answers === 0 ? (
          <SourcesEmpty testId="no-tool-answers" title={`No ${toolLabel} answers yet`}>
            {toolLabel} gave no answers for this business in the last 30 days.
            <Button asChild variant="outline" className="mt-4 w-fit">
              <Link href="/sources">See all tools</Link>
            </Button>
          </SourcesEmpty>
        ) : sources.sites.length === 0 ? (
          <SourcesEmpty testId="no-sources" title="No websites cited yet">
            {toolLabel ?? "AI"} gave {answers} without linking to any websites. Sources show up here as more scans run.
          </SourcesEmpty>
        ) : (
          <>
            <OwnSiteStatus host={sources.ownSite.host} cited={sources.ownSite.answers} toolLabel={toolLabel} />
            <SourcesKpis
              answers={sources.answers}
              sitesUsed={sources.sitesUsed}
              topSource={sources.topSource}
              topMentioning={sources.topMentioning}
              ownSiteHost={sources.ownSite.host}
              ownSiteAnswers={sources.ownSite.answers}
              competitorSiteTimes={sources.competitorSiteTimes}
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <ListedFirst businessId={business.id} listed={sources.listed} add={addToActions} />
              <Card>
                <CardHeader>
                  <CardTitle>Kinds of websites</CardTitle>
                  <CardDescription>Share of {answers} that used each kind.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SourceTypes types={sources.types} answers={sources.answers} />
                </CardContent>
              </Card>
            </div>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>All websites AI used</CardTitle>
                <CardDescription>Out of {answers}.</CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                <SitesTable businessId={business.id} rows={sources.sites} answers={sources.answers} add={addToActions} />
                {sources.moreSites > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground" data-testid="more-sites">
                    {sources.moreSites} more {sources.moreSites === 1 ? "site was" : "sites were"} used less often.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
