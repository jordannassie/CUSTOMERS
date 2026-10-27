"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageSquareText, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { ScanFrequency } from "@/modules/credits/estimate";
import type { QuestionRow } from "@/modules/questions/service";
import { creditChangeText } from "./credits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { QuestionAction } from "./AddQuestionForm";
import { AnswersDialog, type AnswersAction, type AnswersState } from "./AnswersDialog";
import { EditQuestionForm, type EditAction } from "./EditQuestionForm";
import { ResultPips } from "./ResultPips";

export type QuestionActions = { edit: EditAction; setActive: QuestionAction; remove: QuestionAction; answers: AnswersAction };

type Props = {
  businessId: string;
  /** Marked in the answers, so the owner spots their own name. */
  businessName: string;
  question: QuestionRow;
  activeCount: number;
  models: number;
  frequency: ScanFrequency;
  /** Set when the plan has no room, so a paused question cannot be resumed. */
  limitMessage: string | null;
  actions: QuestionActions;
  gridClass: string;
};

export function QuestionItem({ businessId, businessName, question, activeCount, models, frequency, limitMessage, actions, gridClass }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [answers, setAnswers] = useState<AnswersState>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = { businessId, questionId: question.id };
  const fewer = creditChangeText(activeCount, -1, models, frequency);
  // Only suggested questions count in the score, so only they change it when paused, removed or edited (BUG-129).
  const scoreNote = (verb: "Paused" | "Removed") => (question.custom ? "" : ` ${verb} questions stop counting in your score, so your score may change.`);

  function run(action: QuestionAction, input: object, success: string, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action({ ...ids, ...input });
      if (!result.ok) return setError(result.error);
      after?.();
      toast.success(success);
    });
  }

  async function openAnswers() {
    setShowAnswers(true);
    setAnswers(null);
    const result = await actions.answers(ids).catch(() => null);
    if (!result) return setAnswers({ error: "We couldn't load the answers. Try again in a minute." });
    setAnswers(result.ok ? { answers: result.data.answers } : { error: result.error });
  }

  return (
    <li data-testid="question-row" className={cn("relative grid gap-3 px-5 py-4", gridClass, !question.active && "text-muted-foreground")}>
      <div className="flex min-w-0 flex-col gap-1.5 pr-10 lg:pr-0">
        {editing ? (
          <EditQuestionForm businessId={businessId} question={question} edit={actions.edit} onDone={() => setEditing(false)} />
        ) : (
          <p data-testid="question-text" className={cn("text-sm wrap-break-word", question.active && "font-medium text-foreground")}>
            {question.text}
          </p>
        )}
        {(question.custom || !question.active) && !editing && (
          <div className="flex flex-wrap gap-1.5">
            {question.custom && <Badge variant="tint">Added by you</Badge>}
            {question.custom && (
              <Badge variant="outline" data-testid="not-in-score">
                Not counted in your score
              </Badge>
            )}
            {!question.active && <Badge variant="secondary">Paused</Badge>}
          </div>
        )}
        {question.active && !editing && question.summary && question.summary.answers > 0 && (
          <div className="flex flex-col items-start gap-1.5" data-testid="question-summary">
            {question.summary.named.length > 0 && (
              <Chips
                label="AI named"
                items={question.summary.named.map((n) => ({
                  key: n.name,
                  text: n.name,
                  count: n.answers,
                  quiet: !n.tracked,
                  href: n.competitorId ? `/competitors/${n.competitorId}` : undefined,
                }))}
              />
            )}
            {question.summary.you < question.summary.answers && question.summary.sitesWithoutYou.length > 0 && (
              <Chips label="Sites used without you" items={question.summary.sitesWithoutYou.map((s) => ({ key: s.host, text: s.host, count: s.answers, quiet: true }))} />
            )}
            <Button type="button" variant="link" size="sm" className="h-auto gap-1 p-0 text-[13px]" onClick={openAnswers}>
              <MessageSquareText className="size-3.5" aria-hidden="true" />
              See the answers
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-low-text">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 lg:contents">
        {question.results.map((r) => (
          <ResultPips key={r.model} result={r} />
        ))}
      </div>

      <div className="absolute top-3 right-3 lg:static lg:self-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Options for: ${question.text}`} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={openAnswers}>
              <MessageSquareText aria-hidden="true" />
              See the answers
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setError(null);
                setEditing(true);
              }}
            >
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            {question.active ? (
              <DropdownMenuItem onSelect={() => run(actions.setActive, { active: false }, `Question paused. ${fewer}.${scoreNote("Paused")}`)}>
                <Pause aria-hidden="true" />
                Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={limitMessage !== null}
                onSelect={() =>
                  run(actions.setActive, { active: true }, `Question resumed. ${creditChangeText(activeCount, 1, models, frequency)}.`)
                }
              >
                <Play aria-hidden="true" />
                Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(true)}>
              <Trash2 aria-hidden="true" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnswersDialog question={question.text} businessName={businessName} open={showAnswers} onOpenChange={setShowAnswers} state={answers} />

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>Remove this question?</DialogTitle>
            <DialogDescription>
              “{question.text}” and its past results will be deleted.{scoreNote("Removed")} To stop checking it for now,
              pause it instead.
            </DialogDescription>
          </DialogHeader>
          {question.active && <p className="text-sm text-muted-foreground">{fewer}.</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep it</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(actions.remove, {}, question.active ? `Question removed. ${fewer}.` : "Question removed.", () => setConfirmRemove(false))
              }
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Remove question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** "AI named [Bean House 12] [Blue Door 6]": who was named, or which sites were used, with how many answers. */
function Chips({ label, items }: { label: string; items: { key: string; text: string; count: number; quiet: boolean; href?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {items.map((i) => {
        const className = cn(
          "inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5",
          i.quiet ? "border border-border text-muted-foreground" : "bg-muted text-foreground",
          i.href && "hover:bg-primary-tint hover:text-primary",
        );
        const body = (
          <>
            {i.text}
            <span className="tabular-nums text-text-hint">{i.count}</span>
          </>
        );
        // A tracked competitor opens its comparison page.
        return i.href ? (
          <Link key={i.key} href={i.href} className={className}>
            {body}
          </Link>
        ) : (
          <span key={i.key} className={className}>
            {body}
          </span>
        );
      })}
    </div>
  );
}
