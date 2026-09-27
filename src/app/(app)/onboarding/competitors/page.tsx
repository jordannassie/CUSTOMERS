import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { CompetitorPicker } from "@/components/onboarding/CompetitorPicker";
import { Button } from "@/components/ui/button";
import { getCompetitorStep, limitMessage, lookupCompetitorByName, saveCompetitorList } from "@/modules/onboarding";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Competitors", robots: { index: false } };

const PATH = "/onboarding/competitors";

// Onboarding step 5 on its own page until the wizard (B-36) takes it over as one of its steps.
export default async function CompetitorsStepPage() {
  const { activeBusinessId } = await getWorkspace({ next: PATH });
  if (!activeBusinessId) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Add your business first</h1>
          <p className="mt-2 text-sm text-muted-foreground">We look for competitors near your business, so we need its details before this step.</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/add-business">Add your business</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const step = await getCompetitorStep(activeBusinessId, { next: PATH });
  if (!step) notFound();

  return (
    <PageContainer>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Who do you compete with?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each scan checks whether AI recommends these businesses instead of {step.businessName}.
          {step.limit !== null ? ` Your plan tracks up to ${step.limit}.` : null}
        </p>
      </header>
      <CompetitorPicker
        businessId={activeBusinessId}
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
