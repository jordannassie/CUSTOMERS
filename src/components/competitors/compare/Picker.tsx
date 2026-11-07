import Link from "next/link";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { StatusPill } from "@/components/checkin";
import { STANDING_TEXT, type ComparePage } from "@/modules/competitors";
import { AnyBusiness } from "./AnyBusiness";
import { ChipLink } from "./ChipLink";
import type { TrackAction } from "../AlsoRecommended";

const PILL = { ahead: "done", behind: "attention", about_same: "neutral" } as const;

/**
 * Compare's picker, as the Check-in right rail's "Compare with" card (C-Compare): one row per tracked competitor with
 * its score, the one shown in the brand tint, then "{your name} vs {their name}" with both icons and the standing.
 */
export function Picker({ page, tab, track, ownDomain }: { page: ComparePage; tab: string; track: TrackAction; ownDomain: string | null }) {
  const selected = page.selected;
  const subtitle = selected
    ? [selected.panel.why.site, `named in ${selected.panel.why.them} of ${selected.panel.why.answers} answers`].filter(Boolean).join(" · ")
    : null;
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-5" data-testid="compare-picker">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Compare {page.businessName} with</h2>
        <Link href="/competitors/manage" className="text-[13px] font-medium text-brand hover:underline">
          Manage tracked competitors
        </Link>
      </div>
      <div className="flex flex-col gap-2" role="group" aria-label="Pick a competitor">
        {page.options.map((o) => {
          const on = selected?.panel.competitorId === o.id;
          return (
            <ChipLink
              key={o.id}
              id={o.id}
              tab={tab}
              current={on}
              className={cn(
                "flex min-h-11 items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 text-sm transition-colors",
                on ? "border-brand bg-brand-tint-3 font-bold" : "border-border bg-surface font-medium hover:border-border-strong",
              )}
            >
              <span className="min-w-0 truncate">{o.name}</span>
              <span className={cn("shrink-0 tabular-nums", on ? "text-foreground" : "text-muted-foreground")}>{o.score ?? "None"}</span>
            </ChipLink>
          );
        })}
        <AnyBusiness businessId={page.businessId} names={page.also} track={track} />
      </div>
      {selected && (
        <div className="flex items-start gap-3 border-t border-divider pt-3.5">
          {/* Your icon, then theirs tucked behind it, so both businesses are named by their own marks. */}
          <span className="mt-0.5 flex shrink-0 items-center">
            <SiteIcon domain={ownDomain} name={page.businessName} className="relative z-10 ring-2 ring-card" />
            <SiteIcon domain={selected.panel.website.domain ?? null} name={selected.title} className="-ml-2.5 ring-2 ring-card" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="font-display text-lg leading-snug font-semibold break-words">
              {page.businessName} vs {selected.title}
            </h2>
            {selected.collecting ? (
              <StatusPill tone="neutral" className="w-fit">
                Still collecting
              </StatusPill>
            ) : (
              selected.standing && (
                <StatusPill tone={PILL[selected.standing]} className="w-fit">
                  {STANDING_TEXT[selected.standing]}
                </StatusPill>
              )
            )}
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
