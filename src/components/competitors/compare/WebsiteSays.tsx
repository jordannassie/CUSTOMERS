"use client";

import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { tidyQuote } from "@/lib/site-claims";
import type { ClaimRow, ServiceChip } from "@/modules/competitors";

const pageName = (page: string | null) => (page === "/" ? "Home page" : page ? `${page} page` : "Their website");
const sentence = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

/**
 * What their website says (B-91): their services as chips and, below, every claim either site makes. Picking a service
 * turns the list into that service, them against you, with each site's own words; "Show everything" goes back.
 */
export function WebsiteSays({ name, services, claims }: { name: string; services: ServiceChip[]; claims: ClaimRow[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const service = services.find((s) => s.name === picked) ?? null;
  return (
    <div className="flex flex-col gap-4">
      {services.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Services on their website</p>
          <ul className="flex flex-wrap gap-1.5" data-testid="their-services">
            {services.map((s) => (
              <li key={s.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={picked === s.name}
                      onClick={() => setPicked(picked === s.name ? null : s.name)}
                      className={cn(
                        "rounded-xs px-2 py-0.5 text-[13px] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        s.onlyThem ? "bg-mid-bg font-medium text-mid-text" : "bg-muted text-foreground",
                        picked === s.name && "ring-2 ring-primary",
                      )}
                    >
                      {s.name}
                    </button>
                  </TooltipTrigger>
                  {s.quote && (
                    <TooltipContent className="max-w-72">
                      &ldquo;{tidyQuote(s.quote)}&rdquo; ({pageName(s.page).toLowerCase()})
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-hint">
            {services.some((s) => s.onlyThem) ? "Highlighted: not in the services on your website. " : ""}Pick a service to compare it with yours.
          </p>
        </div>
      )}

      {service ? (
        <ServiceCompare name={name} service={service} onClose={() => setPicked(null)} />
      ) : (
        <ClaimList name={name} rows={claims} />
      )}
    </div>
  );
}

function ServiceCompare({ name, service, onClose }: { name: string; service: ServiceChip; onClose: () => void }) {
  const y = service.yours;
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-3" data-testid="service-compare" aria-label={`${service.name}, them and you`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{sentence(service.name)}</h4>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onClose}>
          <X className="size-3.5" aria-hidden="true" />
          Show everything
        </Button>
      </div>
      <Said who={name} tone="them" quote={service.quote} page={service.page} fallback="Listed on their website." />
      {y === null ? (
        <Said who="You" tone="none" fallback="We haven't read your website the same way yet." />
      ) : y === false ? (
        <Said who="You" tone="none" fallback="Not found on the pages we read of yours." />
      ) : y === "mentioned" ? (
        <Said who="You" tone="you" fallback="Your pages use these words, but it isn't in your services." />
      ) : (
        <Said who="You" tone="you" quote={y.quote} page={y.page} fallback={`Listed on your website as "${y.name}".`} />
      )}
    </section>
  );
}

/** One side's words: a name tag, the quote with a coloured line, and the page it is on. */
function Said({ who, tone, quote, page, fallback }: { who: string; tone: "them" | "you" | "none"; quote?: string | null; page?: string | null; fallback: string }) {
  return (
    <figure className="m-0 grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2">
      <figcaption className={cn("truncate pt-0.5 text-xs font-medium", tone === "you" ? "text-primary" : "text-muted-foreground")} title={who}>
        {who}
      </figcaption>
      <div className={cn("flex flex-col gap-0.5 border-l-2 pl-3", tone === "them" ? "border-competitor-1" : tone === "you" ? "border-primary" : "border-border")}>
        {quote ? (
          <>
            <blockquote className="m-0 text-[13px] leading-relaxed text-foreground">&ldquo;{tidyQuote(quote)}&rdquo;</blockquote>
            {page !== undefined && <span className="text-xs text-text-hint">{pageName(page ?? null)}</span>}
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">{fallback}</span>
        )}
      </div>
    </figure>
  );
}

/** Every claim either site makes that questions ask about, side by side, with each site's words. */
function ClaimList({ name, rows }: { name: string; rows: ClaimRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Neither website says the things questions usually ask about.</p>;
  return (
    <div className="flex flex-col gap-1.5" data-testid="website-claims">
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_3rem] gap-2 text-xs text-muted-foreground">
        <span className="font-medium">What their website says</span>
        <span className="truncate text-center" title={name}>
          {name}
        </span>
        <span className="text-center text-primary">You</span>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {rows.map((r) => {
          const gap = !!r.them && r.you === false;
          return (
            <li key={r.key} className={cn("flex flex-col gap-2.5 px-3 py-3", gap && "bg-mid-bg/30")} data-testid="claim-row">
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_3rem] items-center gap-2 text-sm">
                <span className="font-medium">{sentence(r.label)}</span>
                <Mark value={!!r.them} />
                {r.you === null ? (
                  <span className="text-center text-xs text-text-hint" aria-label="Not checked" title="Your website wasn't read the same way yet">
                    ?
                  </span>
                ) : (
                  <Mark value={!!r.you} gap={gap} />
                )}
              </div>
              {r.them && <Said who={name} tone="them" quote={r.them.quote} page={r.them.page} fallback="" />}
              {r.you && <Said who="You" tone="you" quote={r.you.quote} page={r.you.page} fallback="" />}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-hint">From the pages we read on each website. A dash means we didn&apos;t find it there.</p>
    </div>
  );
}

function Mark({ value, gap = false }: { value: boolean; gap?: boolean }) {
  return (
    <span className="flex justify-center">
      {value ? (
        <Check className="size-4 text-good-text" aria-label="Says it" />
      ) : (
        <Minus className={cn("size-4", gap ? "text-mid-text" : "text-text-hint")} aria-label="Not found" />
      )}
    </span>
  );
}
