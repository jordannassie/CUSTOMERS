import Link from "next/link";
import type { AdminBusinessRow } from "@/modules/admin";
import { plural } from "../../_components/format";
import { AgencyLink, LastScan, StateBadge, businessHref, frequencyText, placeNote, planText } from "./row-parts";
import { ModelList } from "./scan-parts";

// The Businesses list on phones: one card a business with what the table shows, its location and agency link too.
// The name and the agency are separate links, so the card itself is not one (a link inside a link is invalid).
export default function BusinessCards({ rows }: { rows: AdminBusinessRow[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface md:hidden">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 px-4 py-3 text-[length:calc(13px*var(--px,1))]">
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-start gap-2">
                <Link
                  href={businessHref(r.id)}
                  className="line-clamp-2 min-w-0 break-words text-[length:calc(14px*var(--px,1))] font-medium text-primary hover:underline"
                  title={r.name}
                >
                  {r.name}
                </Link>
                <StateBadge row={r} />
              </span>
              <span className="text-text-hint">{placeNote(r)}</span>
              <AgencyLink agency={r.agency} />
            </span>
            <LastScan scan={r.lastScan} />
          </span>
          <ModelList models={r.models} className="text-muted-foreground" />
          <span className="text-muted-foreground">{summary(r)}</span>
        </li>
      ))}
    </ul>
  );
}

// "Starter, weekly, 12 credits this month". A deleted business says nothing about a plan: its badge says it all.
function summary(r: AdminBusinessRow): string {
  const plan = planText(r) ?? (r.deleted ? null : "No plan");
  const frequency = frequencyText(r)?.toLowerCase();
  return [plan, frequency, `${plural(r.creditsThisMonth, "credit", "credits")} this month`].filter(Boolean).join(", ");
}
