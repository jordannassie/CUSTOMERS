"use client";

import { Copy, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export type PanelFact = { label: string; value: React.ReactNode };

type Props = {
  open: boolean;
  onClose: () => void;
  /** The question's own list item: the panel is placed in it, so its answers stay part of that row's markup. */
  container: HTMLElement | null;
  id: string;
  title: string;
  /** "Question 3 of 12" */
  position: string | null;
  /** The strip under the header: topic, how often it named you, and so on. */
  facts: PanelFact[];
  /** Where focus goes back to when the panel closes: the question's own button. */
  returnFocus: () => void;
  children: React.ReactNode;
};

/**
 * A question opened from the list (mockup-ui, PromptWatch-style): a wide panel from the right over a blurred page, with
 * the question's facts in a strip, the question itself in a bubble, then its answers. A Sheet, placed in the question's
 * list item instead of at the end of the page.
 */
export function QuestionPanel({ open, onClose, container, id, title, position, facts, returnFocus, children }: Props) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(title);
      toast.success("Question copied");
    } catch {
      toast.error("Couldn't copy. Select the question and copy it instead.");
    }
  };
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      {container && (
        <DialogPrimitive.Portal container={container}>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/15 backdrop-blur-[3px] duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            id={id}
            className="fixed inset-y-0 right-0 z-50 flex w-full cursor-auto flex-col overflow-hidden bg-surface text-foreground shadow-float duration-200 data-open:animate-in data-open:slide-in-from-right-10 data-closed:animate-out data-closed:slide-out-to-right-10 sm:inset-y-2 sm:right-2 sm:w-[min(1180px,calc(100vw-16px))] sm:rounded-xl sm:border sm:border-border"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              returnFocus();
            }}
          >
            <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-border px-5">
              <p className="flex items-baseline gap-2 text-[15px] font-semibold tracking-[-0.01em]">
                Question details
                {position && <span className="text-xs font-normal text-text-hint tabular-nums">{position}</span>}
              </p>
              <DialogPrimitive.Close asChild>
                <Button variant="outline" size="icon-sm" className="shrink-0" aria-label="Close">
                  <XIcon aria-hidden="true" />
                </Button>
              </DialogPrimitive.Close>
            </div>

            <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-border px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
                {facts.map((f) => (
                  <div key={f.label} className="flex min-w-0 flex-col gap-1.5">
                    <dt className="text-[11px] font-medium tracking-[0.04em] text-text-hint uppercase">{f.label}</dt>
                    <dd className="text-[13px] tabular-nums">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2 px-5 pt-5">
                <p className="text-xs font-medium text-muted-foreground">Customer question</p>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-sm font-semibold text-primary-hover">
                    ?
                  </span>
                  <div className="flex min-w-0 items-start gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                    <SheetTitle className="text-[15px] leading-snug font-medium wrap-break-word">{title}</SheetTitle>
                    <button
                      type="button"
                      onClick={copy}
                      className="mt-0.5 shrink-0 rounded-sm p-0.5 text-text-hint outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-label="Copy the question"
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <SheetDescription className="sr-only">What each AI tool answered for this question</SheetDescription>
              </div>

              <div className="px-5 pt-5 pb-6">{children}</div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </Sheet>
  );
}
