import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { STANDING_TEXT, type ComparePage } from "@/modules/competitors";
import { AnyBusiness } from "./AnyBusiness";
import { ChipLink } from "./ChipLink";
import type { TrackAction } from "../AlsoRecommended";

const BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;

/** Compare's picker (dashboard redesign): a chip per tracked competitor with its score, then "You vs {name}". */
export function Picker({ page, tab, track }: { page: ComparePage; tab: string; track: TrackAction }) {
  const selected = page.selected;
  const subtitle = selected
    ? [selected.panel.why.site, `named in ${selected.panel.why.them} of ${selected.panel.why.answers} answers`].filter(Boolean).join(" · ")
    : null;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4" data-testid="compare-picker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Compare {page.businessName} with</span>
        <Link href="/competitors/manage" className="text-xs font-medium text-primary hover:underline">
          Manage tracked competitors
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pick a competitor">
        {page.options.map((o) => {
          const on = selected?.panel.competitorId === o.id;
          return (
            <ChipLink
              key={o.id}
              id={o.id}
              tab={tab}
              current={on}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                on ? "border-primary bg-primary-tint text-primary-hover" : "border-border hover:bg-muted",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: o.color }} aria-hidden="true" />
              <span className="max-w-48 truncate">{o.name}</span>
              <span className={cn("tabular-nums", on ? "text-primary" : "text-muted-foreground")}>{o.score ?? "None"}</span>
            </ChipLink>
          );
        })}
        <AnyBusiness businessId={page.businessId} names={page.also} track={track} />
      </div>
      {selected && (
        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">You vs {selected.title}</h2>
            {selected.collecting ? (
              <Badge variant="secondary">Still collecting</Badge>
            ) : (
              selected.standing && <Badge variant={BADGE[selected.standing]}>{STANDING_TEXT[selected.standing]}</Badge>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {selected.note && (
            <p className="text-sm text-muted-foreground" data-testid="why-chain-note">
              {selected.note}. AI named the chain, so these numbers cover all its locations.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
