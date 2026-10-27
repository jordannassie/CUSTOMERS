import { Suspense } from "react";
import { Globe, Link2, MapPin, MessageSquareText } from "lucide-react";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { FactList } from "@/components/standing/FactList";
import { attachFixes } from "@/lib/fix-match";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignalRow, WhyPanel } from "@/modules/competitors";
import { googleFacts, WHERE_TEXT, type Fact, type Where } from "@/modules/standing";

const GROUPS: { where: Where | null; label: string; icon: typeof Globe }[] = [
  { where: "website", label: WHERE_TEXT.website, icon: Globe },
  { where: "other_places", label: WHERE_TEXT.other_places, icon: Link2 },
  { where: null, label: "In the AI answers", icon: MessageSquareText },
];

/**
 * "Why they're ahead": every likely reason, grouped by where you would fix it, then where you lead. Everything from the
 * saved answers and website reads shows at once; only the Google group waits for Google's live values (D-73).
 */
export function WhyTab({ panel, signals }: { panel: WhyPanel; signals: Promise<SignalRow[]> }) {
  const reasons = panel.why.allReasons.filter((f) => f.where !== "google_listing");
  return (
    <div className="flex flex-col gap-8" data-testid="tab-why">
      {GROUPS.slice(0, 1).map((g) => (
        <Group key={g.label} {...g} facts={reasons.filter((f) => f.where === g.where)} />
      ))}
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <GoogleGroup panel={panel} signals={signals} />
      </Suspense>
      {GROUPS.slice(1).map((g) => (
        <Group key={g.label} {...g} facts={reasons.filter((f) => (f.where ?? null) === g.where)} />
      ))}
      {reasons.length === 0 && (
        <p className="text-sm text-muted-foreground">{"The answers don't point to a clear reason yet. Checking their website on the Websites tab can show more."}</p>
      )}
      {panel.why.allLeads.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Where you lead</h3>
          <FactList facts={panel.why.allLeads} tone="ahead" className="grid gap-2 md:grid-cols-2" />
        </section>
      )}
      <p className="text-xs text-text-hint">From AI answers in the last 30 days and what we read. We can&apos;t see inside the AI tools, so these are likely reasons.</p>
    </div>
  );
}

async function GoogleGroup({ panel, signals }: { panel: WhyPanel; signals: Promise<SignalRow[]> }) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === panel.competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  const google = googleFacts(panel.why.name, theirs, yours);
  if (google.behind.length + google.ahead.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <Group where="google_listing" label={WHERE_TEXT.google_listing} icon={MapPin} facts={attachFixes(google.behind, panel.fixRefs)} />
      {google.ahead.length > 0 && <FactList facts={google.ahead} tone="ahead" className="grid gap-2 md:grid-cols-2" />}
      <GoogleAttribution what="Google listing values" />
    </div>
  );
}

function Group({ label, icon: Icon, facts }: { where: Where | null; label: string; icon: typeof Globe; facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" data-testid="why-group">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary-tint text-primary" aria-hidden="true">
          <Icon className="size-3.5" />
        </span>
        {label}
        <span className="rounded-xs bg-muted px-1.5 text-xs font-normal tabular-nums text-muted-foreground">{facts.length}</span>
      </h3>
      <FactList facts={facts} className="grid gap-2 md:grid-cols-2" />
    </section>
  );
}
