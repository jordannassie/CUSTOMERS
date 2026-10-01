import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { OwnSiteStatus } from "@/components/sources/OwnSiteStatus";
import { SiteList } from "@/components/sources/SiteList";
import { SourceTypes } from "@/components/sources/SourceTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSources } from "@/modules/sources";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Sources", robots: { index: false } };

// B-54, MVP_SPEC 8.1: the websites AI cited for this business's questions, so owners know where to be listed.
export default async function SourcesPage() {
  const workspace = await getWorkspace({ next: "/sources" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const sources = await getSources(business.id);
  if (!sources) notFound();
  const where = sources.place ? ` in ${sources.place}` : "";

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <header className="flex max-w-[680px] flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Websites AI cited in the last 30 days when answering customer questions{where}. Being listed on these
            sites makes it easier for AI to recommend you.
          </p>
        </header>

        {sources.answers === 0 ? (
          <Empty testId="no-scans" title="No scans yet">
            Run your first scan from the Overview to see which websites AI uses.
            <Button asChild className="mt-4 w-fit">
              <Link href="/dashboard">Go to Overview</Link>
            </Button>
          </Empty>
        ) : sources.sites.length === 0 ? (
          <Empty testId="no-sources" title="No websites cited yet">
            AI gave {sources.answers} {sources.answers === 1 ? "answer" : "answers"} without linking to any websites.
            Sources show up here as more scans run.
          </Empty>
        ) : (
          <>
            <OwnSiteStatus ownSite={sources.ownSite} answers={sources.answers} />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <Card className="lg:order-2">
                <CardHeader>
                  <CardTitle className="text-base">Kinds of websites</CardTitle>
                </CardHeader>
                <CardContent>
                  <SourceTypes types={sources.types} answers={sources.answers} />
                </CardContent>
              </Card>
              <Card className="lg:order-1">
                <CardHeader>
                  <CardTitle className="text-base">Websites AI cited</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Out of {sources.answers} AI {sources.answers === 1 ? "answer" : "answers"}, most cited first.
                  </p>
                </CardHeader>
                <CardContent>
                  <SiteList sites={sources.sites} answers={sources.answers} />
                  {sources.moreSites > 0 && (
                    <p className="mt-3 text-sm text-muted-foreground" data-testid="more-sites">
                      {sources.moreSites} more {sources.moreSites === 1 ? "site was" : "sites were"} cited less often.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function Empty({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex flex-col">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="mt-1 flex max-w-[560px] flex-col text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}
