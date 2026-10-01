"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Impact, OpportunityItem, Status } from "@/modules/opportunities";
import { CopyButton } from "./CopyButton";

const IMPACT: Record<Impact, { label: string; variant: "low" | "mid" | "secondary" }> = {
  high: { label: "High impact", variant: "low" },
  medium: { label: "Medium impact", variant: "mid" },
  low: { label: "Low impact", variant: "secondary" },
};

/** One line per fix that opens in place (DB-014), so several fixes fit on one screen. */
export function OpportunityCard({
  item,
  busy,
  onStatus,
  defaultOpen = false,
}: {
  item: OpportunityItem;
  busy: boolean;
  onStatus: (status: Status) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const impact = IMPACT[item.impact];
  const finding = (item.evidence ?? item.whyItMatters)?.split("\n")[0] ?? null;

  return (
    <article className="rounded-md border border-border bg-surface" data-testid="opportunity" data-status={item.status}>
      <header className="relative flex flex-col items-start gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
        {/* A fixed column so every title starts at the same x, whatever the badge says. */}
        <div className="flex shrink-0 sm:w-28">
          <Badge variant={impact.variant}>{impact.label}</Badge>
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
            {/* The whole row opens the fix; the copy button sits above this layer. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((o) => !o)}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50 sm:line-clamp-1"
            >
              {item.title}
            </button>
          </h2>
          {finding && !open && <p className="line-clamp-2 text-[13px] text-muted-foreground sm:line-clamp-1">{finding}</p>}
        </div>
        {item.claudePrompt && (
          <div className="relative z-10">
            <CopyButton
              text={item.claudePrompt}
              label="Copy for Claude"
              copiedNote="Prompt copied. Paste it into Claude to get a draft."
            />
          </div>
        )}
        <ChevronDown
          aria-hidden
          className={cn(
            "absolute top-4 right-4 size-4 shrink-0 text-muted-foreground transition-transform duration-200 sm:static",
            open && "rotate-180",
          )}
        />
      </header>

      {open && (
        <div id={bodyId} className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:px-5">
          {(item.evidence || item.whyItMatters) && (
            <div className="flex max-w-[720px] flex-col gap-3 text-sm">
              {item.evidence && (
                <Section title="What we found">
                  <p className="whitespace-pre-line">{item.evidence}</p>
                  {item.usesGoogle && <GoogleAttribution what="Review counts and ratings" className="mt-1" />}
                </Section>
              )}
              {item.whyItMatters && (
                <Section title="Why it matters">
                  <p className="whitespace-pre-line text-muted-foreground">{item.whyItMatters}</p>
                </Section>
              )}
            </div>
          )}

          {item.steps.length > 0 && (
            <Section title="Steps">
              <ol className="flex max-w-[720px] list-decimal flex-col gap-1.5 pl-5 text-sm marker:text-muted-foreground">
                {item.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Section>
          )}

          <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {item.status === "open" ? (
              <>
                <Button type="button" size="sm" disabled={busy} onClick={() => onStatus("done")}>
                  <Check aria-hidden />
                  Mark as done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onStatus("dismissed")}
                  className="sm:ml-auto"
                >
                  <X aria-hidden />
                  Dismiss
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onStatus("open")}>
                <RotateCcw aria-hidden />
                Move back to to-do
              </Button>
            )}
          </footer>
        </div>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[13px] font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
