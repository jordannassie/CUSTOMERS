import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddActionDialog } from "@/components/actions/AddActionDialog";
import { ActionsBoard } from "@/components/actions/ActionsBoard";
import { OpenCount } from "@/components/actions/OpenCount";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { GetFoundChecklist } from "@/components/opportunities/GetFoundChecklist";
import { PickBranch } from "@/components/opportunities/PickBranch";
import { WaitForFixes } from "@/components/opportunities/WaitForFixes";
import { Button } from "@/components/ui/button";
import { canEditTracking } from "@/modules/entitlements";
import { checkFixes, getFixesState } from "@/modules/insights";
import { pickBranch, searchBranches } from "@/modules/onboarding";
import { OPEN_ACTION_STATUSES, addToActions, assignActionToMe, getActionsBoard, getActionsExtras, moveActionTo, setChecklistItem } from "@/modules/opportunities";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Actions", robots: { index: false } };

// Actions (dashboard redesign, 2026-10-27; was Opportunities, B-52): every fix as a card on a board, most important
// first, each saying where to apply it. Fixes from a comparison arrive through "Add to Actions" on Compare or Sources.
// A fix id from another page's link (?fix=) is opened and scrolled to; anything else is ignored.
const FIX_ID = /^[0-9a-f-]{36}$/i;

export default async function ActionsPage({ searchParams }: { searchParams: Promise<{ fix?: string; google?: string }> }) {
  const { fix, google: askGoogle } = await searchParams;
  // Google is asked for the numbers in fix texts only when the owner pressed "Show Google numbers" (?google=1).
  const google = askGoogle === "1";
  const pickedId = fix && FIX_ID.test(fix) ? fix : null;
  const workspace = await getWorkspace({ next: "/actions" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  // The fixes are read once (the board); the extras are the business row and its checklist ticks only.
  const [view, board, fixes] = await Promise.all([
    getActionsExtras(business.id),
    getActionsBoard(business.id, { google }),
    getFixesState(business.id),
  ]);
  if (!view || !board || !fixes) notFound();
  const open = board.items.filter((i) => OPEN_ACTION_STATUSES.includes(i.status)).length;
  // An ended plan is read-only (MVP_SPEC 4.4): fixes stay readable, nothing can be moved, added or ticked. The actions
  // refuse it too; this only hides the buttons that would fail.
  const readOnly = workspace.account ? !canEditTracking(workspace.account).allowed : false;

  return (
    <PageContainer wide>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Actions"
          description={
            <>
              Fixes that get AI to name {business.name} more often, most important first. Each one says where to apply it.
              {board.items.length > 0 && (
                <OpenCount businessId={business.id} initial={open} />
              )}
              {/* The banner above the page says why (plan ended or paused) and links to Billing. */}
              {readOnly && <span data-testid="actions-read-only"> You can read these fixes but not change them right now.</span>}
            </>
          }
          actions={readOnly ? null : <AddActionDialog businessId={business.id} add={addToActions} />}
        />

        {view.branch && !readOnly && <PickBranch key={`branch-${business.id}`} businessId={business.id} initial={view.branch} search={searchBranches} pick={pickBranch} />}

        {view.checklist && (
          <GetFoundChecklist key={business.id} businessId={business.id} missing={view.checklist.missing} initialItems={view.checklist.items} setItem={setChecklistItem} readOnly={readOnly} />
        )}

        {fixes.pending ? (
          <section className="rounded-md border border-border bg-surface p-5" data-testid="fixes-working">
            <WaitForFixes businessId={business.id} check={checkFixes} />
            {board.items.length > 0 ? <p className="mt-3 text-sm text-muted-foreground">Below are the fixes from your previous scan until then.</p> : null}
          </section>
        ) : null}

        {board.items.length === 0 ? (
          fixes.pending ? null : (
            <section className="rounded-md border border-border bg-surface p-5" data-testid="no-opportunities">
              <h2 className="text-base font-semibold tracking-[-0.02em]">{fixes.everScanned ? "Nothing to fix right now" : "No actions yet"}</h2>
              <p className="mt-3 max-w-[560px] text-sm text-muted-foreground">
                {fixes.everScanned
                  ? "Your latest scan found no fixes. New ones appear here when a scan shows why AI picks other businesses, or add one from Compare."
                  : "Fixes appear after a scan shows why AI picks other businesses. Run a scan from the Overview to get your list."}
              </p>
              {!fixes.everScanned && (
                <Button asChild className="mt-3 w-fit">
                  <Link href="/dashboard">Go to Overview</Link>
                </Button>
              )}
            </section>
          )
        ) : (
          <ActionsBoard
            key={`board-${business.id}-${pickedId ?? ""}`}
            businessId={business.id}
            initialItems={board.items}
            move={moveActionTo}
            assign={assignActionToMe}
            pickedId={pickedId}
            readOnly={readOnly}
          />
        )}
      </div>
    </PageContainer>
  );
}
