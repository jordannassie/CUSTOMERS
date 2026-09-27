import type { QuestionRow, QuestionsView } from "@/modules/questions/service";
import { QuestionItem, type QuestionActions } from "./QuestionItem";

// Tailwind needs whole class names, so one per number of chosen models.
const GRID: Record<number, string> = {
  0: "lg:grid-cols-[minmax(0,1fr)_36px]",
  1: "lg:grid-cols-[minmax(0,1fr)_112px_36px]",
  2: "lg:grid-cols-[minmax(0,1fr)_repeat(2,112px)_36px]",
  3: "lg:grid-cols-[minmax(0,1fr)_repeat(3,112px)_36px]",
};

type Props = {
  title: string;
  description: string;
  testId: string;
  questions: QuestionRow[];
  view: QuestionsView;
  limitMessage: string | null;
  actions: QuestionActions;
};

export function QuestionList({ title, description, testId, questions, view, limitMessage, actions }: Props) {
  const grid = `${GRID[view.models.length] ?? GRID[3]} lg:items-start lg:gap-x-6`;
  const shared = {
    businessId: view.businessId,
    activeCount: view.active.length,
    models: view.models.length,
    frequency: view.frequency,
    limitMessage,
    actions,
  };

  return (
    <section aria-labelledby={`${testId}-title`} data-testid={testId} className="overflow-hidden rounded-md border border-border bg-surface">
      <div className={`grid gap-1 border-b border-border px-5 py-4 ${grid}`}>
        <div className="flex flex-col gap-1">
          <h2 id={`${testId}-title`} className="text-base font-semibold">
            {title}
          </h2>
          <p className="text-[13px] text-muted-foreground">{description}</p>
        </div>
        {view.models.map((m) => (
          <p key={m.id} className="hidden self-end text-xs font-medium text-muted-foreground lg:block">
            {m.label}
          </p>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {questions.map((q) => (
          <QuestionItem key={q.id} question={q} gridClass={grid} {...shared} />
        ))}
      </ul>
    </section>
  );
}
