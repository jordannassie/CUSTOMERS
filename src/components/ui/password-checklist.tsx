"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "cn";
import { PASSWORD_RULES } from "@/lib/password-rules";

/**
 * The password rule as a checklist under a new-password field, each line ticked as it is met (owner, 2026-11-18).
 * The screen reader hears each line's state once, when the field points at it (aria-describedby).
 */
export function PasswordChecklist({ id, value }: { id: string; value: string }) {
  return (
    <ul id={id} className="grid grid-cols-1 gap-x-4 gap-y-1 text-[length:calc(12.5px*var(--px,1))] sm:grid-cols-2" data-testid="password-rules">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={cn("flex items-center gap-1.5", met ? "text-good-text" : "text-muted-foreground")} data-met={met}>
            {met ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <Circle className="size-3 shrink-0" aria-hidden="true" />}
            <span>
              {rule.label}
              <span className="sr-only">{met ? ", done" : ", still needed"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
