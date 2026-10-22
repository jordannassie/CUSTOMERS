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
  chooseSetupPlan,
  confirmBusinessPlace,
  getAddBusinessBlock,
  getCardStep,
  getCompetitorStep,
  getDetailsStep,
  getFinishBlock,
  getModelsStep,
  getQuestionsStep,
  getSetupAddOn,
  getSetupPlans,
  getWebsiteStep,
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
      // No draft here, so nothing is saved yet: the note only says how to go on.
      if (blocked) return <UpgradeNote reason={blocked} hasBusinesses={state.hasFinishedBusiness} />;
    }
    // Back from a later step: what was entered shows again, so the same business sent again never starts over.
    const saved = draftId ? await getWebsiteStep(draftId, next) : null;
    return (
      <WebsiteStep
        defaultDomain={saved?.domain ?? ""}
        defaultNoWebsite={saved ? !saved.hasWebsite : false}
        defaultName={saved?.name ?? ""}
        defaultCity={saved?.city ?? ""}
        backHref={state.hasFinishedBusiness ? undefined : stepPath("agency")}
        plan={plan}
        save={saveWebsiteStep}
        pick={confirmBusinessPlace}
      />
    );
  }
  // canOpen() lets these steps open only with a draft business.
  if (!draftId) redirect(stepPath("website"));

  if (step === "details") {
    const d = await getDetailsStep(draftId, next);
    if (!d) redirect(stepPath("website"));
    return (
      <DetailsStep
        businessId={draftId}
        domain={d.domain}
        details={d.details}
        industryText={d.industryText}
        aliases={d.aliases}
        confirmed={d.confirmed}
        save={saveDetailsStep}
        findAgainRequest={d.hasWebsite ? (d.domain ? { domain: d.domain } : null) : d.details.name && d.details.city ? { name: d.details.name, city: d.details.city } : null}
        findAgain={saveWebsiteStep}
        pick={confirmBusinessPlace}
      />
    );
  }
  if (step === "competitors") {
    const c = await getCompetitorStep(draftId, { next });
    if (!c) redirect(stepPath("website"));
    // Keyed by the saved list: a step shown again keeps its state (Back), but not once the list changed on the server,
    // as when a move to another city removed competitors (2026-10-16).
    return (
      <CompetitorsStep
        key={[...c.saved.map((s) => s.placesId ?? s.name), c.locationNote].join("|")}
        businessId={draftId}
        limit={c.limit}
        limitText={c.limit !== null ? limitMessage(c.limit) : null}
        saved={c.saved}
        suggestions={c.suggestions}
        note={c.note}
        locationNote={c.locationNote}
        lookup={lookupCompetitorByName}
        save={saveCompetitorsStep}
      />
    );
  }
  if (step === "questions") {
    const q = await getQuestionsStep(draftId, next);
    if (q === "no-city" || !q) redirect(stepPath("details"));
    return <QuestionsStep businessId={draftId} questions={q.questions} limit={q.limit} updated={q.updated} save={saveQuestionsStep} />;
  }
  if (step === "card") {
    const c = await getCardStep(draftId, next);
    if (!c) redirect(stepPath("models"));
    // A trial already started (or a test agency): the step only waits for the webhook, then finishes.
    if (!state.needsCard || c.started) return <SettingUp businessId={draftId} check={checkCardStep} />;
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
  const [m, setup, addOnState, blocked] = await Promise.all([
    getModelsStep(draftId, next),
    getSetupPlans(draftId, next),
    // Only when setup finishes here: on the card step the checkout bills the business.
    state.needsCard ? null : getSetupAddOn(draftId, next),
    state.needsCard ? null : getFinishBlock(next),
  ]);
  if (!m) redirect(stepPath("website"));
  // A trial with 2 set-up businesses already: the draft stays saved until the plan starts (D-16).
  if (blocked) return <UpgradeNote reason={blocked} hasBusinesses={state.hasFinishedBusiness} draftSaved />;
  // The price check failed: the step still loads and says so, and Finish waits for Try again (BUG-252).
  const addOn = addOnState && "unavailable" in addOnState ? null : addOnState;
  const addOnError = addOnState && "unavailable" in addOnState ? addOnState.unavailable : null;
  // The plan finishing bills: Billing's add-on plan when the business joins a running subscription, else the draft's.
  const planId = addOn?.planId ?? setup.planId;
  const current = setup.plans.find((p) => p.id === planId);
  return (
    <ModelsStep
      businessId={draftId}
      models={m.models as ModelId[]}
      frequency={m.frequency as Frequency}
      activeQuestions={m.activeQuestions}
      plan={current ? { name: current.name, monthlyCredits: current.monthlyCredits } : m.plan}
      planChoice={setup.plans.length > 1 ? { plans: setup.plans, currentId: planId, choose: chooseSetupPlan } : null}
      finishLabel={state.needsCard ? "Continue" : "Finish setup"}
      addOn={addOn}
      addOnError={addOnError}
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
