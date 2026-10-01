import { redirect } from "next/navigation";
import { SettingUp } from "@/components/onboarding/CardBits";
import { AgencyStep } from "@/components/onboarding/AgencyStep";
import { CompetitorsStep } from "@/components/onboarding/CompetitorsStep";
import { DetailsStep } from "@/components/onboarding/DetailsStep";
import { ModelsStep } from "@/components/onboarding/ModelsStep";
import { QuestionsStep } from "@/components/onboarding/QuestionsStep";
import { WebsiteStep } from "@/components/onboarding/WebsiteStep";
import { Skeleton } from "@/components/ui/skeleton";
import {
  checkCardStep,
  getAddBusinessBlock,
  getCardStep,
  getCompetitorStep,
  getDetailsStep,
  getModelsStep,
  getQuestionsStep,
  limitMessage,
  lookupCompetitorByName,
  saveAgencyStep,
  saveCompetitorsStep,
  saveDetailsStep,
  saveModelsStep,
  saveQuestionsStep,
  saveWebsiteStep,
  startCardStep,
  stepPath,
  type StepSlug,
  type WizardContext,
} from "@/modules/onboarding";
import type { Frequency, ModelId } from "@/modules/settings";
import { uploadAgencyLogo } from "@/modules/settings";
import { CardCheckout } from "./_components/card-checkout";
import { UpgradeNote } from "./upgrade-note";

export const TITLES: Record<StepSlug, { title: string; lead: string }> = {
  agency: { title: "Welcome. What's your agency called?", lead: "A few quick steps and we'll check what AI says about your first business." },
  website: { title: "Which business should we check?", lead: "Start with its website. We'll fill in the rest for you." },
  details: { title: "Check your business details", lead: "AI matches answers to these details, so keep them the same as your website and Google listing." },
  competitors: { title: "Who do you compete with?", lead: "Each scan checks whether AI recommends these businesses instead of yours." },
  questions: { title: "What do your customers ask AI?", lead: "We ask ChatGPT, Claude and Perplexity these questions and look for your business in the answers." },
  models: { title: "Choose the AI to check, and how often", lead: "You can change these any time. Credits are only used when a scan runs." },
  card: { title: "Start your 7-day free trial", lead: "Add a card to start. You won't be charged today." },
};

type Props = { step: StepSlug; state: WizardContext; plan: string | null; returned: boolean };

export async function StepContent({ step, state, plan, returned }: Props) {
  const next = stepPath(step);
  const draftId = state.draft?.id;

  if (step === "agency") {
    return <AgencyStep defaultName={state.agencyName ?? ""} logoUrl={state.agencyLogoUrl} plan={plan} save={saveAgencyStep} uploadLogo={uploadAgencyLogo} />;
  }
  if (step === "website") {
    if (!draftId) {
      const blocked = await getAddBusinessBlock(next);
      if (blocked) return <UpgradeNote reason={blocked} hasBusinesses={state.hasFinishedBusiness} />;
    }
    const details = draftId ? await getDetailsStep(draftId, next) : null;
    return (
      <WebsiteStep
        defaultDomain={details?.domain ?? ""}
        defaultNoWebsite={details ? !details.hasWebsite : false}
        backHref={state.hasFinishedBusiness ? undefined : stepPath("agency")}
        save={saveWebsiteStep}
      />
    );
  }
  // canOpen() lets these steps open only with a draft business.
  if (!draftId) redirect(stepPath("website"));

  if (step === "details") {
    const d = await getDetailsStep(draftId, next);
    if (!d) redirect(stepPath("website"));
    return <DetailsStep businessId={draftId} details={d.details} industryText={d.industryText} confirmed={d.confirmed} save={saveDetailsStep} />;
  }
  if (step === "competitors") {
    const c = await getCompetitorStep(draftId, { next });
    if (!c) redirect(stepPath("website"));
    return (
      <CompetitorsStep
        businessId={draftId}
        limit={c.limit}
        limitText={c.limit !== null ? limitMessage(c.limit) : null}
        saved={c.saved}
        suggestions={c.suggestions}
        note={c.note}
        lookup={lookupCompetitorByName}
        save={saveCompetitorsStep}
      />
    );
  }
  if (step === "questions") {
    const q = await getQuestionsStep(draftId, next);
    if (q === "no-city" || !q) redirect(stepPath("details"));
    return <QuestionsStep businessId={draftId} questions={q.questions} limit={q.limit} save={saveQuestionsStep} />;
  }
  if (step === "card") {
    const c = await getCardStep(draftId, next);
    if (!c) redirect(stepPath("models"));
    // A trial already started (or a test agency): the step only waits for the webhook, then finishes.
    if (!state.needsCard) return <SettingUp businessId={draftId} check={checkCardStep} />;
    if (!c.offer) {
      return (
        <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
          Your plan isn&apos;t available to start right now. Please contact us and we&apos;ll set it up.
        </p>
      );
    }
    const { mode, publishableKey, ...offer } = c.offer;
    return (
      <CardCheckout
        businessId={draftId}
        offer={offer}
        mode={mode}
        publishableKey={publishableKey}
        returned={returned}
        start={startCardStep}
        check={checkCardStep}
      />
    );
  }
  const m = await getModelsStep(draftId, next);
  if (!m) redirect(stepPath("website"));
  return (
    <ModelsStep
      businessId={draftId}
      models={m.models as ModelId[]}
      frequency={m.frequency as Frequency}
      activeQuestions={m.activeQuestions}
      plan={m.plan}
      finishLabel={state.needsCard ? "Continue" : "Finish setup"}
      save={saveModelsStep}
    />
  );
}

const WAITING: Partial<Record<StepSlug, string>> = {
  competitors: "Finding businesses near you on Google",
  questions: "Picking questions for your business",
};

export function StepSkeleton({ step }: { step: StepSlug }) {
  const label = WAITING[step] ?? "Loading this step";
  return (
    <div role="status" aria-live="polite" aria-busy className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{label}…</p>
      <div className="rounded-md border border-border bg-surface">
        {Array.from({ length: step === "questions" ? 8 : 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${60 + ((i * 17) % 35)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
