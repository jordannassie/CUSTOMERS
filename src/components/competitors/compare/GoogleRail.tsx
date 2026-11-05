import Link from "next/link";
import { ShowGoogleLabel } from "@/components/app/ShowGoogleLabel";
import { RailCard, StatRows } from "@/components/checkin";
import { Button } from "@/components/ui/button";
import { GoogleAttribution } from "@/components/onboarding/PlaceBits";
import type { PlaceSignals, SignalRow } from "@/modules/competitors";

const rating = (s: PlaceSignals | null) =>
  s?.rating == null ? "Not listed" : `${s.rating.toFixed(1)}${s.reviewCount != null ? ` (${s.reviewCount.toLocaleString("en-US")})` : ""}`;

/**
 * C-Compare's "On Google" rail card. Only after "Show Google details" (?google=1): the values are asked from Google for
 * this view and never stored (D-73), so the card says where they come from.
 */
export async function GoogleRail({ name, competitorId, signals }: { name: string; competitorId: string; signals: Promise<SignalRow[]> }) {
  const rows = await signals;
  const theirs = rows.find((r) => r.competitorId === competitorId)?.signals ?? null;
  const yours = rows.find((r) => r.isYou)?.signals ?? null;
  return (
    <RailCard title="On Google">
      {theirs || yours ? (
        <>
          <StatRows
            rows={[
              { label: "Your rating", value: rating(yours) },
              { label: `${name}'s rating`, value: rating(theirs) },
              { label: `${name} website on Google`, value: theirs ? (theirs.website ? "Listed" : "Missing") : "Not listed" },
            ]}
          />
          <GoogleAttribution what="Google values" />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Google details aren&apos;t available for both of you right now.</p>
      )}
    </RailCard>
  );
}

/** Before "Show Google details": the rail card says what it would show and asks Google only when pressed. */
export function GoogleRailPrompt({ href }: { href: string }) {
  return (
    <RailCard title="On Google" testId="rail-show-google">
      <p className="text-sm text-muted-foreground">Ratings and reviews for the two of you, live from Google. Asked only when you press the button.</p>
      <Button asChild variant="outline" className="w-fit">
        <Link href={href} scroll={false}>
          <ShowGoogleLabel />
        </Link>
      </Button>
    </RailCard>
  );
}
