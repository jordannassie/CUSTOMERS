import Link from "next/link";
import { ArrowRight, Globe, Link2, MapPin, ThumbsUp } from "lucide-react";
import { cn } from "cn";
import { fixHref } from "@/lib/fix-where";
import type { Fact, Where } from "@/modules/standing/reasons";
import { WHERE_TEXT } from "@/modules/standing/where";

const ICON: Record<Where, typeof Globe> = { website: Globe, google_listing: MapPin, other_places: Link2 };

/**
 * Likely reasons (or your leads) as short rows: what we saw, then what to do and where to do it. "Open this fix" shows
 * only when a saved fix deals with this exact reason (`fixId`, matched by place and words) and opens that fix; a reason
 * with no saved fix shows its step and no link, so nothing sends the owner to an unrelated fix. No hooks, so server and
 * client screens both use it.
 */
export function FactList({ facts, tone = "behind", testId, className }: { facts: Fact[]; tone?: "behind" | "ahead"; testId?: string; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2", className)} data-testid={testId}>
      {facts.map((f) => {
        const Icon = tone === "ahead" ? ThumbsUp : f.where ? ICON[f.where] : Globe;
        return (
          <li key={f.text} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3" data-testid="fact">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  tone === "ahead" ? "bg-good-bg text-good-text" : "bg-mid-bg text-mid-text",
                )}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{f.title}</span>
                {f.detail && <span className="text-[13px] text-muted-foreground">{f.detail}</span>}
              </span>
            </div>
            {tone === "behind" && f.where && <ToDo fact={f} where={f.where} />}
          </li>
        );
      })}
    </ul>
  );
}

function ToDo({ fact, where }: { fact: Fact; where: Where }) {
  const Place = ICON[where];
  return (
    <div className="mt-auto flex flex-col gap-2 rounded-md bg-muted/60 px-3 py-2.5" data-testid="fix-step">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">What to do</span>
        <span className="inline-flex items-center gap-1 rounded-xs border border-border bg-surface px-1.5 py-0.5 font-medium text-foreground" data-testid="fix-where">
          <Place className="size-3 text-muted-foreground" aria-hidden="true" />
          {WHERE_TEXT[where]}
        </span>
      </p>
      <p className="text-[13px] leading-snug text-foreground" data-testid="fix-action">
        {fact.action ?? `Make this change on ${WHERE_TEXT[where].toLowerCase()}.`}
      </p>
      {fact.fixId && (
        <Link
          href={fixHref(fact.fixId)}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
          data-testid="fix-link"
        >
          Open the saved fix for this
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
