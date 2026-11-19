import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { compareCount, compareRating, openDays, sideOf, type Compare, type RatingCompare } from "@/lib/google-compare";
import type { SignalRow } from "@/modules/competitors";
import { RetryButton } from "@/components/app/RetryButton";
import { LinkListing, type ListingActions } from "./LinkListing";

/** Them and you on Google, the leader of each line in bold green. Live values for this view only (D-73). */
export async function GoogleTable({
  name,
  competitorId,
  signals,
  listing = null,
}: {
  name: string;
  competitorId: string;
  signals: Promise<SignalRow[]>;
  /** "Link Google listing" for a side with none (owner, 2026-11-17). */
  listing?: { businessId: string; actions: ListingActions } | null;
}) {
  const rows = await signals;
  const theirRow = rows.find((r) => r.competitorId === competitorId) ?? null;
  const yourRow = rows.find((r) => r.isYou) ?? null;
  const theirs = theirRow?.signals ?? null;
  const yours = yourRow?.signals ?? null;
  if (!theirs || !yours) {
    const failed = [theirRow, yourRow].some((r) => r?.status === "error" || r?.status === "limited");
    if (failed) {
      return (
        <div className="flex flex-col items-start gap-2" data-testid="google-unavailable">
          <p className="text-sm text-muted-foreground">Google details could not be loaded just now.</p>
          <RetryButton />
        </div>
      );
    }
    // Say which side has no listing, and let the owner link it, instead of "both of you" (owner, 2026-11-17).
    const missing = [
      ...(yourRow && !yours ? [{ label: "Your business", name: yourRow.name, competitorId: undefined }] : []),
      ...(theirRow && !theirs ? [{ label: name, name, competitorId }] : []),
    ];
    return (
      <div className="flex flex-col items-start gap-3" data-testid="google-unavailable">
        <p className="text-sm text-muted-foreground">To compare you on Google, both businesses need a Google listing linked.</p>
        <ul className="flex flex-col gap-2">
          {missing.map((m) => (
            <li key={m.label} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" data-testid="google-missing-side">
              <span>
                {m.label} has no Google listing linked.
              </span>
              {listing && <LinkListing target={{ businessId: listing.businessId, competitorId: m.competitorId }} name={m.name} actions={listing.actions} />}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const theirDays = openDays(theirs.hours);
  const yourDays = openDays(yours.hours);
  const days = (n: number | null) => (n === null ? "Not listed" : `${n} a week`);
  const lines: { label: string; them: string; you: string; lead: "them" | "you" | null }[] = [
    { label: "Reviews", them: fmt(theirs.reviewCount), you: fmt(yours.reviewCount), lead: leader(compareCount(theirs.reviewCount, yours.reviewCount)) },
    { label: "Rating", them: theirs.rating?.toFixed(1) ?? "Not listed", you: yours.rating?.toFixed(1) ?? "Not listed", lead: leader(compareRating(theirs.rating, yours.rating)) },
    { label: "Open days", them: days(theirDays), you: days(yourDays), lead: leader(compareCount(theirDays, yourDays, 0)) },
    { label: "Category", them: theirs.categories[0] ?? "Not listed", you: yours.categories[0] ?? "Not listed", lead: null },
  ];
  const lead = "font-semibold text-foreground";
  return (
    <div className="flex flex-col gap-1" data-testid="why-google">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="w-[30%] py-1.5 text-left font-medium">
              <span className="sr-only">On Google</span>
            </th>
            <th className="truncate py-1.5 text-left font-medium">{name}</th>
            <th className="py-1.5 text-left font-medium text-primary">You</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {lines.map((l) => (
            <tr key={l.label}>
              <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">
                {l.label}
              </th>
              <td className={cn("py-2 pr-3 tabular-nums wrap-break-word", l.lead === "them" && lead)}>{l.them}</td>
              <td className={cn("py-2 tabular-nums wrap-break-word", l.lead === "you" && lead)}>{l.you}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <GoogleAttribution what="Google values" />
    </div>
  );
}

const fmt = (n: number | null) => (n === null ? "Not listed" : n.toLocaleString("en-US"));

/** The same rule as the Google reasons: review counts within 10% and ratings under 0.1 apart are level. */
function leader(compare: Compare | RatingCompare): "them" | "you" | null {
  const side = sideOf(compare);
  return side === "they_are_ahead" ? "them" : side === "you_are_ahead" ? "you" : null;
}
