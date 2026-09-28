"use client";

import { Check, RotateCcw, X } from "lucide-react";
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

export function OpportunityCard({
  item,
  busy,
  onStatus,
}: {
  item: OpportunityItem;
  busy: boolean;
  onStatus: (status: Status) => void;
}) {
  const impact = IMPACT[item.impact];
  return (
    <article
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5"
      data-testid="opportunity"
      data-status={item.status}
    >
      <header className="flex flex-col items-start gap-2">
        <Badge variant={impact.variant}>{impact.label}</Badge>
        <h3 className="text-base font-semibold tracking-[-0.01em]">{item.title}</h3>
      </header>

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
        {item.claudePrompt && (
          <CopyButton
            text={item.claudePrompt}
            label="Copy for Claude"
            copiedNote="Prompt copied. Paste it into Claude to get a draft."
          />
        )}
        {item.status === "open" ? (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => onStatus("done")}>
              <Check aria-hidden />
              Mark as done
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onStatus("dismissed")} className="sm:ml-auto">
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
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-[13px] font-medium text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}
