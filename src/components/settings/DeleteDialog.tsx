"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmsName } from "@/modules/account/service";
import { FormError } from "./SettingsSection";

export type Step = { when: string; what: string };

type Props = {
  /** What is deleted, typed back to confirm: the business or agency name. */
  name: string;
  openLabel: string;
  title: string;
  steps: Step[];
  confirmLabel: string;
  pendingLabel: string;
  /** Runs the delete; returns an error message, or null when it worked. */
  run: (confirmName: string) => Promise<string | null>;
};

// Deleting is the one place settings slows people down: the dialog spells out what happens when, and the
// button stays off until the exact name is typed.
export function DeleteDialog({ name, openLabel, title, steps, confirmLabel, pendingLabel, run }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, start] = useTransition();
  const matches = confirmsName(typed, name);

  function change(next: boolean) {
    if (deleting) return;
    setOpen(next);
    setTyped("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setError(null);
    start(async () => {
      const failed = await run(typed);
      if (failed) setError(failed);
      else setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit border-low/50 text-low-text hover:bg-low-bg"
        onClick={() => change(true)}
      >
        {openLabel}
      </Button>
      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="sm:max-w-md" data-testid="delete-dialog">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Here is what happens, and when.</DialogDescription>
            </DialogHeader>

            <ol className="flex flex-col" aria-label="What happens">
              {steps.map((step, i) => (
                <li key={step.when} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < steps.length - 1 && <span className="absolute top-3 left-[5px] h-full w-px bg-border" aria-hidden="true" />}
                  <span
                    className={cn(
                      "relative mt-1.5 size-[11px] shrink-0 rounded-full border-2",
                      i === 0 ? "border-low bg-low" : "border-border bg-surface",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{step.when}</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{step.what}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-name">
                Type <span className="font-semibold text-foreground">{name}</span> to confirm
              </Label>
              <Input
                id="confirm-name"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-invalid={typed !== "" && !matches}
              />
            </div>
            <FormError message={error} />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={deleting}>
                  Keep it
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={!matches || deleting}>
                {deleting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {deleting ? pendingLabel : confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
