import { CircleCheck, Hourglass, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { LocalDate } from "@/components/ui/local-date";
import type { ActionEffect } from "@/modules/opportunities";

const plural = (n: number) => `${n} ${n === 1 ? "answer" : "answers"}`;

/** What a done action's card says about the scans since (B-98). "Since", never "because": the change is not proven. */
export function effectText(effect: ActionEffect | null): string {
  if (!effect || effect.state === "waiting") {
    const since = effect?.scansSince ?? 0;
    const needed = effect?.scansNeeded ?? 2;
    return since === 0
      ? `We will measure the effect over your next ${needed} scans.`
      : `${since} of ${needed} scans done since. The change shows after the next scan.`;
  }
  const { after, before, change } = effect;
  const now = `AI named you in ${after.named} of ${plural(after.total)}`;
  if (!before) return `Since you marked this done, ${now}. There were no answers in the 30 days before to compare.`;
  const then = `${before.named} of ${plural(before.total)}`;
  if (change === "up") return `Since you marked this done, ${now}, up from ${then} in the 30 days before.`;
  if (change === "down") return `Since you marked this done, ${now}, down from ${then} in the 30 days before.`;
  return `Since you marked this done, ${now}, about the same as ${then} in the 30 days before.`;
}

export function ActionEffectNote({ effect }: { effect: ActionEffect | null }) {
  const Icon = !effect || effect.state === "waiting" ? Hourglass : effect.change === "up" ? TrendingUp : effect.change === "down" ? TrendingDown : Minus;
  const tone = effect?.state === "measured" && effect.change === "up" ? "text-good-text" : "text-muted-foreground";
  return (
    <p className={`flex items-start gap-1.5 text-[length:calc(12px*var(--px,1))] leading-snug ${tone}`} data-testid="action-effect">
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{effectText(effect)}</span>
    </p>
  );
}

/** "Done Nov 14" in a done card's footer, in the viewer's own time zone (LocalDate). */
export function DoneOn({ iso }: { iso: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground" data-testid="action-done">
      <CircleCheck className="size-3" aria-hidden="true" />
      Done <LocalDate iso={iso} options={{ month: "short", day: "numeric" }} />
    </span>
  );
}
