"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { PILL_BOX, PILL_CLASS } from "@/components/app/pills";
import { AddToActionsButton } from "@/components/actions/AddToActionsButton";
import { Button } from "@/components/ui/button";
import { fixHref } from "@/lib/fix-where";
import { STATUS_TEXT, toActionStatus } from "@/modules/opportunities/board/service";
import type { QuestionAnswer } from "@/modules/questions/answers";
import { useQuestions } from "./QuestionsProvider";

/**
 * "What to do" under "Why you were skipped", laid out like Compare's: the fix for a site this answer used, where to
 * make it, and one button. A saved fix opens on Actions (picked out there); one not saved yet is added, then opened.
 */
export function SkippedFix({ answer: a }: { answer: QuestionAnswer }) {
  const { view, addAction } = useQuestions();

  if (a.fix) {
    const status = toActionStatus(a.fix.status ?? "open");
    return (
      <Fix title={a.fix.title} where={a.fix.host} badge={<span className={cn(PILL_BOX, PILL_CLASS.inActions)}>In Actions · {STATUS_TEXT[status]}</span>}>
        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link href={fixHref(a.fix.id)} data-testid="skipped-fix-link">
            Open in Actions
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </Fix>
    );
  }

  if (a.addFix && addAction) {
    return (
      <Fix title={a.addFix.whatToDo} where={a.addFix.whereToApply} testId="skipped-fix-add">
        <AddToActionsButton input={{ businessId: view.businessId, ...a.addFix }} initial={null} add={addAction} openAfterAdd />
      </Fix>
    );
  }

  return <p className="text-[13px] text-muted-foreground">This answer used no site you can get listed on, so there is no one place to fix it.</p>;
}

function Fix({ title, where, badge, testId, children }: { title: string; where: string; badge?: React.ReactNode; testId?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">What to do</span>
        {badge}
      </div>
      <p className="text-[13px] leading-snug font-medium" data-testid="skipped-fix-title">
        {title}
      </p>
      <p className="text-xs text-muted-foreground">Where: {where}</p>
      {children}
    </div>
  );
}
