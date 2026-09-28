import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/app/PageContainer";
import { AddQuestionForm } from "@/components/questions/AddQuestionForm";
import { CreditSummary } from "@/components/questions/CreditSummary";
import { QuestionList } from "@/components/questions/QuestionList";
import {
  addQuestion,
  atLimit,
  editQuestion,
  getQuestionsPage,
  limitText,
  removeQuestion,
  setQuestionActive,
} from "@/modules/questions";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Questions", robots: { index: false } };

const PATH = "/questions";
const actions = { edit: editQuestion, setActive: setQuestionActive, remove: removeQuestion };

// B-53, MVP_SPEC 5.3 and 8.1: the questions we ask AI for this business, and how often each one recommended it.
export default async function QuestionsPage() {
  const workspace = await getWorkspace({ next: PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  const view = await getQuestionsPage(business.id, PATH);
  if (!view) notFound();
  const limitMessage = view.limit !== null && atLimit(view.active.length, view.limit) ? limitText(view.limit) : null;
  const names = view.models.map((m) => m.label);
  const asked = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "AI");

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <header className="flex max-w-[680px] flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Questions</h1>
          <p className="text-sm text-muted-foreground">
            The customer questions we ask {asked} for you on every scan. Each bar shows the last checks from the past
            30 days, filled in where AI recommended you.
          </p>
        </header>

        <CreditSummary view={view} />

        <AddQuestionForm
          businessId={view.businessId}
          city={view.city}
          activeCount={view.active.length}
          models={view.models.length}
          frequency={view.frequency}
          limitMessage={limitMessage}
          add={addQuestion}
        />

        {view.active.length === 0 ? (
          <div data-testid="no-questions" className="rounded-md border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">No active questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Scans check nothing until you add a question{view.paused.length > 0 ? " or resume a paused one" : ""}.
            </p>
          </div>
        ) : (
          <QuestionList
            testId="active-questions"
            title="Being checked"
            description="How often AI recommended you, out of the last checks for each question."
            questions={view.active}
            view={view}
            limitMessage={limitMessage}
            actions={actions}
          />
        )}

        {view.paused.length > 0 && (
          <QuestionList
            testId="paused-questions"
            title="Paused"
            description="Not checked and no credits used. Past results stay until they are 30 days old."
            questions={view.paused}
            view={view}
            limitMessage={limitMessage}
            actions={actions}
          />
        )}
      </div>
    </PageContainer>
  );
}
