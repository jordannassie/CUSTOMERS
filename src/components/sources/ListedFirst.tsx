import { Badge } from "@/components/ui/badge";
import { SiteIcon } from "@/components/app/SiteIcon";
import type { Impact } from "@/modules/sources/listings";
import type { ListedSite } from "@/modules/sources/rows";
import { AddToActionsButton, type AddToActions } from "./AddToActionsButton";

const IMPACT: Record<Impact, { label: string; variant: "low" | "mid" | "secondary" }> = {
  high: { label: "High", variant: "low" },
  medium: { label: "Medium", variant: "mid" },
  low: { label: "Low", variant: "secondary" },
};

type Props = { businessId: string; listed: ListedSite[]; add: AddToActions };

/**
 * Check-in "Where I'd act first" (C-Sources): the most used sites that skip the business, each an inner card with its
 * fix, impact and an "Add to Actions" pill. The card's lead and the "Open Actions" link come from the page.
 */
export function ListedFirst({ businessId, listed, add }: Props) {
  return (
    <div data-testid="listed-first">
      {listed.length === 0 ? (
        <p className="text-[15px] text-ink-2" data-testid="listed-first-empty">
          Every listing site AI used also named you. Keep those listings up to date.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {listed.map((s) => (
            <li
              key={s.host}
              className="flex flex-wrap items-center gap-3.5 rounded-lg border border-border px-4 py-3.5"
              data-testid="listed-site"
            >
              <div className="flex min-w-[220px] flex-[1_1_280px] items-start gap-3">
                <SiteIcon domain={s.host} name={s.host} size="sm" className="mt-px" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span className="truncate font-bold" title={s.host}>{s.host}</span>
                    <span className="text-xs text-muted-foreground">{s.kindLabel}</span>
                  </p>
                  <p className="text-sm leading-normal text-ink-2">
                    {s.used} {s.fix}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5 pl-9 sm:pl-0">
                <Badge variant={IMPACT[s.impact].variant} data-testid="impact">
                  <span className="sr-only">Impact: </span>
                  {IMPACT[s.impact].label}
                </Badge>
                <AddToActionsButton businessId={businessId} action={s.action} inActions={s.inActions} actionId={s.actionId} add={add} tone="brand" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
