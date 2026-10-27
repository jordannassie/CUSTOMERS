import { cn } from "cn";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import { openDays } from "@/lib/google-compare";
import type { SignalRow } from "@/modules/competitors";

/** Them and you on Google, the leader of each line in bold green. Live values for this view only (D-73). */
export async function GoogleTable({ name, competitorId, signals }: { name: string; competitorId: string; signals: Promise<SignalRow[]> }) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  if (!theirs || !yours) return <p className="text-muted-foreground">{"Google details aren't available for both of you right now."}</p>;
  const theirDays = openDays(theirs.hours);
  const yourDays = openDays(yours.hours);
  const days = (n: number | null) => (n === null ? "Not listed" : `${n} a week`);
  const lines: { label: string; them: string; you: string; lead: "them" | "you" | null }[] = [
    { label: "Reviews", them: fmt(theirs.reviewCount), you: fmt(yours.reviewCount), lead: leader(theirs.reviewCount, yours.reviewCount) },
    { label: "Rating", them: theirs.rating?.toFixed(1) ?? "None", you: yours.rating?.toFixed(1) ?? "None", lead: leader(theirs.rating, yours.rating) },
    { label: "Open days", them: days(theirDays), you: days(yourDays), lead: leader(theirDays, yourDays) },
    { label: "Category", them: theirs.categories[0] ?? "None", you: yours.categories[0] ?? "None", lead: null },
  ];
  const lead = "font-semibold text-good-text";
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

const fmt = (n: number | null) => (n === null ? "None" : n.toLocaleString("en-US"));

function leader(them: number | null, you: number | null): "them" | "you" | null {
  if (them === null || you === null || them === you) return null;
  return them > you ? "them" : "you";
}
