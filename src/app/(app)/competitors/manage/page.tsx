import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { CompetitorPicker } from "@/components/onboarding/CompetitorPicker";
import { getCompetitorStep, limitMessage, lookupCompetitorByName, saveCompetitorList } from "@/modules/onboarding";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Manage competitors", robots: { index: false } };

const PATH = "/competitors/manage";

// B-50 manage list: B-35's picker with the plan limit (B-16), outside onboarding.
export default async function ManageCompetitorsPage() {
  const workspace = await getWorkspace({ next: PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const step = await getCompetitorStep(business.id, { next: PATH });
  if (!step) notFound();

  return (
    <PageContainer>
      <Link
        href="/competitors"
        className="-mt-2.5 mb-1.5 inline-flex items-center gap-1.5 py-2.5 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to competitors
      </Link>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Manage competitors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each scan checks whether AI recommends these businesses instead of {step.businessName}.
          {step.limit !== null ? ` Your plan tracks up to ${step.limit}.` : null}
        </p>
      </header>
      <CompetitorPicker
        businessId={business.id}
        limit={step.limit}
        limitText={step.limit !== null ? limitMessage(step.limit) : null}
        saved={step.saved}
        suggestions={step.suggestions}
        note={step.note}
        lookup={lookupCompetitorByName}
        save={saveCompetitorList}
      />
    </PageContainer>
  );
}
