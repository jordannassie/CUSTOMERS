import Link from "next/link";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
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
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card" data-testid="compare-picker">
      <div className="flex flex-col gap-3 px-[18px] py-3.5">
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
                  "inline-flex h-8 items-center gap-2 rounded-[6px] border px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "border-primary/50 bg-primary-tint text-primary-hover" : "border-border bg-surface hover:bg-muted",
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: o.color }} aria-hidden="true" />
                <span className="max-w-48 truncate">{o.name}</span>
                <span className={cn("rounded-sm px-1 text-xs tabular-nums", on ? "bg-surface text-primary" : "bg-muted text-muted-foreground")}>{o.score ?? "None"}</span>
              </ChipLink>
            );
          })}
          <AnyBusiness businessId={page.businessId} names={page.also} track={track} />
        </div>
      </div>
      {selected && (
        <div className="flex items-start gap-3 border-t border-border px-[18px] py-3.5">
          <SiteIcon domain={selected.panel.website.domain ?? null} name={selected.title} className="mt-0.5" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">You vs {selected.title}</h2>
              {selected.collecting ? (
                <Badge variant="secondary">Still collecting</Badge>
              ) : (
                selected.standing && <Badge variant={BADGE[selected.standing]}>{STANDING_TEXT[selected.standing]}</Badge>
              )}
            </div>
            {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
            {selected.note && (
              <p className="text-[13px] text-muted-foreground" data-testid="why-chain-note">
                {selected.note}.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
