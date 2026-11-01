"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldMessage, useFieldErrors, type FieldErrors } from "@/components/ui/field-errors";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/modules/auth";
import { cn } from "cn";

export type Outcome = ActionResult<unknown>;

/** What a card's own fields need to show their error under them (UI-036). */
export type CardFields = {
  props: (key: string, hintId?: string) => { "aria-invalid"?: boolean; "aria-describedby"?: string };
  message: (key: string) => React.ReactNode;
  clear: (key: string) => void;
};

export const MIN_REASON = 3;

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
  children?: React.ReactNode | ((fields: CardFields) => React.ReactNode);
  /** Checks the card's own fields before it runs, in form order; the reason is always checked. */
  validate?: (form: FormData) => FieldErrors<string>;
  // Controlled by the list, so only one action form is open at a time.
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: (form: FormData, reason: string) => Promise<Outcome>;
};

/** One agency action: opens a short form that always asks for a reason, then reports what happened. */
export default function ActionCard(props: Props) {
  const { title, note, openLabel, submitLabel, pendingLabel, successText, destructive, blocked, children, run, validate } = props;
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
  const errors = useFieldErrors<string>(reasonId);
  const fields: CardFields = {
    props: errors.fieldProps,
    message: (key) => <FieldMessage id={errors.idOf(key)} message={errors.errors[key]} />,
    clear: errors.clear,
  };

  // Opening moves focus into the form; closing it puts focus back on the open button.
  useEffect(() => {
    if (open && !wasOpen.current) formRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
    if (!open && returnFocus.current) openButtonRef.current?.focus();
    returnFocus.current = false;
    wasOpen.current = open;
  }, [open]);

  function close() {
    returnFocus.current = true;
    errors.show({});
    setOpen(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    setMessage(null);
    // Our own messages under each field instead of the browser's popups (noValidate).
    const problems = {
      ...validate?.(form),
      reason: reason.length < MIN_REASON ? `Give a reason of at least ${MIN_REASON} characters.` : undefined,
    };
    if (errors.show(problems)) return;
    startTransition(async () => {
      // A thrown action (a server error) would otherwise leave the form open with no message (A4).
      const result = await run(form, reason).catch(
        (): Outcome => ({ ok: false, status: 500, error: "Something went wrong, so this may not have been saved. Refresh the page and check." }),
      );
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
          noValidate
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !pending) {
              e.preventDefault();
              close();
            }
          }}
          className="flex flex-col gap-3"
        >
          {typeof children === "function" ? children(fields) : children}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>Reason</Label>
            <Textarea
              id={reasonId}
              name="reason"
              maxLength={500}
              rows={2}
              placeholder="Saved in the audit log with your name"
              onChange={() => errors.clear("reason")}
              {...errors.fieldProps("reason")}
            />
            {fields.message("reason")}
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
