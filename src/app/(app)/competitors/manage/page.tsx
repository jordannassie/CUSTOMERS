import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { CompetitorAliases } from "@/components/competitors/CompetitorAliases";
import { CompetitorPicker } from "@/components/onboarding/CompetitorPicker";
import { getCompetitorAliases, saveCompetitorAliases } from "@/modules/competitors";
import { getCompetitorStep, limitMessage, lookupCompetitorByName, saveCompetitorList } from "@/modules/onboarding";
import { getWorkspace } from "@/modules/workspace";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata = { title: "Manage competitors", robots: { index: false } };

const PATH = "/competitors/manage";

// B-50 manage list: B-35's picker with the plan limit (B-16), outside onboarding.
export default async function ManageCompetitorsPage() {
  const workspace = await getWorkspace({ next: PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const [step, aliases] = await Promise.all([getCompetitorStep(business.id, { next: PATH }), getCompetitorAliases(business.id, PATH)]);
  if (!step || !aliases) notFound();

  return (
    <PageContainer>
      <Link
        href="/competitors"
        className="-mt-2.5 mb-1.5 inline-flex items-center gap-1.5 py-2.5 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to competitors
      </Link>
      <div className="mb-6">
        <PageHeader
          title="Manage competitors"
          description={
            <>
              Each scan checks whether AI recommends these businesses instead of {step.businessName}.
              {step.limit !== null ? ` Your plan tracks up to ${step.limit}.` : null}
            </>
          }
        />
      </div>
      {/* Keyed by the saved list and the move note: a list changed by a move, or saved for the new place, shows fresh. */}
      <CompetitorPicker
        key={[...step.saved.map((s) => s.placesId ?? s.name), step.locationNote].join("|")}
        businessId={business.id}
        limit={step.limit}
        limitText={step.limit !== null ? limitMessage(step.limit) : null}
        saved={step.saved}
        suggestions={step.suggestions}
        note={step.note}
        locationNote={step.locationNote}
        lookup={lookupCompetitorByName}
        save={saveCompetitorList}
      />
      {/* Keyed by the list, so a competitor added or removed above shows here after the save. */}
      <CompetitorAliases key={aliases.map((c) => c.id).join()} businessId={business.id} competitors={aliases} save={saveCompetitorAliases} />
    </PageContainer>
  );
}
