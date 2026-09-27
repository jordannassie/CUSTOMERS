import { Star } from "lucide-react";
import { cn } from "cn";

// Google's rule for Places data shown without a map: the words "Google Maps", unchanged, untranslated
// and on one line, in the same container as the data (MVP_SPEC 26).
export function GoogleAttribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Ratings and addresses from{" "}
      <span translate="no" className="notranslate whitespace-nowrap font-[Roboto,sans-serif] font-normal">
        Google Maps
      </span>
    </p>
  );
}

const reviews = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "review" : "reviews"}`;

export function PlaceRating({ rating, reviewCount }: { rating: number | null; reviewCount: number | null }) {
  if (rating === null) return <span className="shrink-0 text-xs text-text-hint">No Google rating</span>;
  return (
    <span className="flex shrink-0 items-center gap-1 text-[13px] tabular-nums" aria-label={`${rating.toFixed(1)} stars from ${reviews(reviewCount ?? 0)}`}>
      <Star aria-hidden className="size-3.5 fill-mid text-mid" />
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">({(reviewCount ?? 0).toLocaleString("en-US")})</span>
    </span>
  );
}
