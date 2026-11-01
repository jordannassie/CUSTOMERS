"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { ClaimRow, ServiceChip } from "@/modules/competitors";
import { QuoteBox, QuoteRow, Said, useOpenRows } from "./QuoteRows";

const sentence = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

type Yours = ServiceChip["yours"];
const STATUS = {
  missing: { text: "Not on your site", variant: "mid" },
  mentioned: { text: "Mentioned only", variant: "secondary" },
  listed: { text: "On your site", variant: "good" },
  unknown: { text: "Not checked", variant: "secondary" },
} as const;
const statusOf = (y: Yours): keyof typeof STATUS => (y === null ? "unknown" : y === false ? "missing" : y === "mentioned" ? "mentioned" : "listed");
// Gaps first: what they list and you don't is what to act on.
const ORDER: (keyof typeof STATUS)[] = ["missing", "mentioned", "listed", "unknown"];

/**
 * What their website says (B-91, redesigned 2026-10-28): their services, each with whether yours lists it, and the
 * things customers ask about, each side marked. Every row opens to both sites' words; one button opens them all.
 */
export function WebsiteSays({ name, services, claims }: { name: string; services: ServiceChip[]; claims: ClaimRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      {services.length > 0 && <Services name={name} services={services} />}
      <Claims name={name} rows={claims} />
    </div>
  );
}

function Services({ name, services }: { name: string; services: ServiceChip[] }) {
  const sorted = [...services].sort((a, b) => ORDER.indexOf(statusOf(a.yours)) - ORDER.indexOf(statusOf(b.yours)));
  const rows = useOpenRows(sorted.map((s) => s.name));
  const read = services.every((s) => s.yours !== null);
  const listed = services.filter((s) => !!s.yours && s.yours !== "mentioned").length;
  return (
    <QuoteBox
      title="Services on their website"
      summary={read ? `You list ${listed} of their ${services.length}. Open one to see both websites' words.` : "Open one to see their words."}
      everyOpen={rows.everyOpen}
      onToggleAll={rows.toggleAll}
      testId="their-services"
    >
      {sorted.map((s) => {
        const status = STATUS[statusOf(s.yours)];
        return (
          <QuoteRow
            key={s.name}
            label={sentence(s.name)}
            open={rows.open.has(s.name)}
            onToggle={() => rows.toggle(s.name)}
            aside={<Badge variant={status.variant}>{status.text}</Badge>}
            tone={s.yours === false ? "gap" : undefined}
            testId="service-row"
          >
            <Said who={name} tone="them" about={s.name} quote={s.quote} page={s.page} fallback="Listed on their website." />
            <YourService about={s.name} yours={s.yours} />
          </QuoteRow>
        );
      })}
    </QuoteBox>
  );
}

function YourService({ about, yours }: { about: string; yours: Yours }) {
  if (yours === null) return <Said who="You" tone="you" about={about} fallback="We haven't read your website the same way yet." />;
  if (yours === false) return <Said who="You" tone="you" about={about} fallback="Not found on the pages we read of yours." />;
  if (yours === "mentioned") return <Said who="You" tone="you" about={about} fallback="Your pages use these words, but it isn't in your services." />;
  return <Said who="You" tone="you" about={about} quote={yours.quote} page={yours.page} fallback={`Listed on your website as "${yours.name}".`} />;
}

/** Every claim either site makes that questions ask about, each side marked, opening to each site's words. */
function Claims({ name, rows }: { name: string; rows: ClaimRow[] }) {
  // Claim quotes are short, so they start open.
  const open = useOpenRows(
    rows.map((r) => r.key),
    true,
  );
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Neither website says the things questions usually ask about.</p>;
  }
  const head = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_1rem] gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground">
      <span>A dash means we didn&apos;t find it on that website.</span>
      <span className="grid grid-cols-[4.5rem_3rem] text-center">
        <span className="truncate" title={name}>
          {name}
        </span>
        <span className="font-medium text-primary">You</span>
      </span>
      <span />
    </div>
  );
  return (
    <QuoteBox
      title="Things customers ask about"
      summary="What each website says on the topics in customers' questions."
      everyOpen={open.everyOpen}
      onToggleAll={open.toggleAll}
      head={head}
      testId="website-claims"
    >
      {rows.map((r) => {
        const gap = !!r.them && r.you === false;
        return (
          <QuoteRow
            key={r.key}
            label={sentence(r.label)}
            open={open.open.has(r.key)}
            onToggle={() => open.toggle(r.key)}
            tone={gap ? "gap" : undefined}
            testId="claim-row"
            aside={
              <span className="grid grid-cols-[4.5rem_3rem] items-center">
                <Mark value={!!r.them} />
                {r.you === null ? (
                  <span className="text-center text-xs text-text-hint" aria-label="Not checked" title="Your website wasn't read the same way yet">
                    ?
                  </span>
                ) : (
                  <Mark value={!!r.you} gap={gap} />
                )}
              </span>
            }
          >
            <Said who={name} tone="them" about={r.label} quote={r.them ? r.them.quote : null} page={r.them ? r.them.page : undefined} fallback="Not found on their pages." />
            <Said
              who="You"
              tone="you"
              about={r.label}
              quote={r.you ? r.you.quote : null}
              page={r.you ? r.you.page : undefined}
              fallback={r.you === null ? "We haven't read your website the same way yet." : "Not found on the pages we read of yours."}
            />
          </QuoteRow>
        );
      })}
    </QuoteBox>
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
