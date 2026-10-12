import { cn } from "cn";
import type { CompetitorCandidate } from "@/modules/onboarding";
import { PlaceRating } from "./PlaceBits";

type Props = {
  place: CompetitorCandidate;
  checked: boolean;
  /** Another branch of a business already picked (BUG-093): shown, but it can't be ticked. */
  branch: boolean;
  onToggle: () => void;
};

/** One Google suggestion on the competitors step. */
export function SuggestionRow({ place, checked, branch, onToggle }: Props) {
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted",
          checked && "bg-primary-tint hover:bg-primary-tint",
          branch && "cursor-default hover:bg-transparent",
        )}
      >
        <input type="checkbox" checked={checked} disabled={branch} onChange={onToggle} className="size-4 shrink-0 accent-primary" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{place.name}</span>
          {place.address ? <span className="block truncate text-[13px] text-muted-foreground">{place.address}</span> : null}
          {branch ? (
            <span className="block text-[13px] text-muted-foreground" data-testid="other-branch">
              Already tracking {place.name}
            </span>
          ) : null}
        </span>
        <PlaceRating rating={place.rating} reviewCount={place.reviewCount} />
      </label>
    </li>
  );
}
