import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { GetFoundChecklist } from "@/components/opportunities/GetFoundChecklist";
import { OpportunityList } from "@/components/opportunities/OpportunityList";
import { PickBranch } from "@/components/opportunities/PickBranch";
import { WaitForFixes } from "@/components/opportunities/WaitForFixes";
import { Button } from "@/components/ui/button";
import { checkFixes, getFixesState } from "@/modules/insights";
import { pickBranch, searchBranches } from "@/modules/onboarding";
import { getOpportunitiesPage, setChecklistItem, setOpportunityStatus } from "@/modules/opportunities";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Opportunities", robots: { index: false } };

// B-52, MVP_SPEC 8.1: every fix step, most important first, with status and a "Copy for Claude" prompt.
export default async function OpportunitiesPage() {
  const workspace = await getWorkspace({ next: "/opportunities" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [view, fixes] = await Promise.all([getOpportunitiesPage(business.id), getFixesState(business.id)]);
  if (!view || !fixes) notFound();
  const toDo = view.items.filter((o) => o.status === "open").length;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <header className="flex max-w-[680px] flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            What to fix so AI recommends you more often, most important first.
            {view.items.length > 0 && (
              <span data-testid="to-do-count">
                {" "}
                {toDo === 0 ? "You have done or dismissed every fix." : `${toDo} ${toDo === 1 ? "fix" : "fixes"} to do.`}
              </span>
            )}
          </p>
        </header>

        {view.branch && (
          <PickBranch key={`branch-${business.id}`} businessId={business.id} initial={view.branch} search={searchBranches} pick={pickBranch} />
        )}

        {view.checklist && (
          <GetFoundChecklist
            key={business.id}
            businessId={business.id}
            missing={view.checklist.missing}
            initialItems={view.checklist.items}
            setItem={setChecklistItem}
          />
        )}

        {fixes.pending ? (
          <section className="rounded-md border border-border bg-surface p-5" data-testid="fixes-working">
            <WaitForFixes businessId={business.id} check={checkFixes} />
            {view.items.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Below are the fixes from your previous scan until then.</p>
            ) : null}
          </section>
        ) : null}

        {view.items.length === 0 ? (
          fixes.pending ? null : fixes.everScanned ? (
            <section className="rounded-md border border-border bg-surface p-5" data-testid="no-opportunities">
              <h2 className="text-base font-semibold">Nothing to fix right now</h2>
              <p className="mt-1 max-w-[560px] text-sm text-muted-foreground">
                Your latest scan found no fixes. New steps appear here when a scan shows why AI picks other businesses.
              </p>
            </section>
          ) : (
            <section className="rounded-md border border-border bg-surface p-5" data-testid="no-opportunities">
              <h2 className="text-base font-semibold">No fixes yet</h2>
              <p className="mt-1 max-w-[560px] text-sm text-muted-foreground">
                Fixes appear after a scan shows why AI picks other businesses. Run a scan from the Overview to get your list.
              </p>
              <Button asChild className="mt-4 w-fit">
                <Link href="/dashboard">Go to Overview</Link>
              </Button>
            </section>
          )
        ) : (
          <OpportunityList key={`list-${business.id}`} businessId={business.id} initialItems={view.items} setStatus={setOpportunityStatus} />
        )}
      </div>
    </PageContainer>
  );
}
