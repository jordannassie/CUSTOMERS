"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/modules/auth";
import { cn } from "cn";

export type Outcome = ActionResult<unknown>;

type Props = {
  title: string;
  note: string;
  openLabel: string;
  submitLabel: string;
  pendingLabel: string;
  successText: string;
  destructive?: boolean;
  // Why the action cannot run right now; shown instead of the button.
  blocked?: string | null;
  children?: React.ReactNode;
  // Controlled by the list, so only one action form is open at a time.
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: (form: FormData, reason: string) => Promise<Outcome>;
};

/** One agency action: opens a short form that always asks for a reason, then reports what happened. */
export default function ActionCard(props: Props) {
  const { title, note, openLabel, submitLabel, pendingLabel, successText, destructive, blocked, children, run } = props;
  const { open, onOpenChange: setOpen } = props;
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  // Set when this card closes itself; another card opening closes this one too, and must keep its own focus.
  const returnFocus = useRef(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const reasonId = useId();
  const headingId = useId();

  // Opening moves focus into the form; closing it puts focus back on the open button.
  useEffect(() => {
    if (open && !wasOpen.current) formRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
    if (!open && returnFocus.current) openButtonRef.current?.focus();
    returnFocus.current = false;
    wasOpen.current = open;
  }, [open]);

  function close() {
    returnFocus.current = true;
    setOpen(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    setMessage(null);
    startTransition(async () => {
      const result = await run(form, reason);
      if (result.ok) {
        close();
        setMessage({ tone: "ok", text: successText });
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 px-4 py-4">
      <div>
        <h3 id={headingId} className="text-[14px] font-semibold">
          {title}
        </h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{note}</p>
      </div>

      {blocked ? (
        <p className="text-[13px] text-text-hint">{blocked}</p>
      ) : open ? (
        <form
          ref={formRef}
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !pending) {
              e.preventDefault();
              close();
            }
          }}
          className="flex flex-col gap-3"
        >
          {children}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>Reason</Label>
            <textarea
              id={reasonId}
              name="reason"
              required
              minLength={3}
              maxLength={500}
              rows={2}
              placeholder="Saved in the audit log with your name"
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-[14px] outline-none placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          ref={openButtonRef}
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
        >
          {openLabel}
        </Button>
      )}

      <p
        aria-live="polite"
        className={cn("text-[13px] empty:hidden", message?.tone === "error" ? "text-low-text" : "text-good-text")}
      >
        {message?.text}
      </p>
    </section>
  );
}
