import { addToActions } from "@/modules/opportunities";
import { notFound, redirect } from "next/navigation";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { AddQuestionForm } from "@/components/questions/AddQuestionForm";
import { FocusAnswers } from "@/components/questions/FocusAnswers";
import { HeaderActions } from "@/components/questions/HeaderActions";
import { KpiStrip } from "@/components/questions/KpiStrip";
import { QuestionsProvider } from "@/components/questions/QuestionsProvider";
import { QuestionTable } from "@/components/questions/QuestionTable";
import {
  addQuestion,
  atLimit,
  editQuestion,
  getQuestionAnswers,
  getQuestionsPage,
  limitText,
  questionsPageParams,
  removeQuestion,
  setQuestionActive,
} from "@/modules/questions";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Questions", robots: { index: false } };

const PATH = "/questions";
const actions = { edit: editQuestion, setActive: setQuestionActive, remove: removeQuestion, answers: getQuestionAnswers };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// B-53, MVP_SPEC 5.3 and 8.1, dashboard redesign (Questions): the questions we ask AI for this business, how often each
// one named it, and what each AI answered. Links from other pages may open one question (?q=) or narrow the list to
// the answers that used a site (?site=) or named a business (?named=), built with questionsHref.
export default async function QuestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = questionsPageParams.parse(await searchParams);
  const workspace = await getWorkspace({ next: PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const view = await getQuestionsPage(business.id, PATH, { site: params.site, named: params.named, ai: params.ai });
  if (!view) notFound();
  const limitMessage = view.limit !== null && atLimit(view.active.length, view.limit) ? limitText(view.limit) : null;
  const names = view.models.map((m) => m.label);
  const asked = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "AI");
  const focus = { q: params.q ?? null, site: params.site ?? null, named: params.named ?? null, ai: params.ai ?? null };

  return (
    <PageContainer>
      {/* Keyed by the link, so a new ?q= or ?site= starts the list fresh. */}
      <QuestionsProvider key={`${business.id}-${focus.q}-${focus.site}-${focus.named}-${focus.ai}`} view={view} focus={focus} addAction={addToActions}>
        <div className="flex flex-col gap-6">
          <PageHeader
            title={
              <>
                Questions <SampleDataBadge show={workspace.account?.isTest} />
              </>
            }
            description={<>What we ask {asked} for you on every scan, and what each one answered.</>}
            actions={<HeaderActions />}
          />

          {/* Which AIs the last scan could not check, so a gap in the list is never read as "not asked" (BUG-074). */}
          {view.scanNotice && (
            <p role="status" className="rounded-md border border-border bg-mid-bg px-4 py-3 text-sm text-mid-text" data-testid="scan-notice">
              {view.scanNotice}
            </p>
          )}

          {/* Opened from "See the answers": the answers the link is about, before the list of questions. */}
          <FocusAnswers />

          <KpiStrip view={view} />

          <AddQuestionForm
            businessId={view.businessId}
            example={view.example}
            activeCount={view.active.length}
            models={view.models.length}
            frequency={view.frequency}
            limitMessage={limitMessage}
            add={addQuestion}
          />

          <QuestionTable limitMessage={limitMessage} actions={actions} />
        </div>
      </QuestionsProvider>
    </PageContainer>
  );
}
