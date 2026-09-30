import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "cn";

// Google requires its unmodified Google Maps logo for Places data shown without a map: 16 to 19px tall,
// 10px clear space left, right and top, 5px below, in the same container as the data (docs/launch/places-compliance.md).
export function GoogleAttribution({ className, what = "Ratings and addresses" }: { className?: string; what?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center text-xs text-muted-foreground", className)} data-testid="google-attribution">
      <span>{what} from</span>
      <Image
        src="/images/google-maps-logo.svg"
        alt="Google Maps"
        width={87}
        height={16}
        className="box-content h-4 w-auto shrink-0 px-2.5 pt-2.5 pb-1.25"
      />
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
