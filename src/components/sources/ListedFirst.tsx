import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Impact } from "@/modules/sources/listings";
import type { ListedSite } from "@/modules/sources/rows";
import { AddToActionsButton, type AddToActions } from "./AddToActionsButton";
import { SiteIcon } from "@/components/app/SiteIcon";

const IMPACT: Record<Impact, { label: string; variant: "low" | "mid" | "secondary" }> = {
  high: { label: "High", variant: "low" },
  medium: { label: "Medium", variant: "mid" },
  low: { label: "Low", variant: "secondary" },
};

type Props = { businessId: string; listed: ListedSite[]; add: AddToActions };

/** The most used sites that skip the business, each with its fix and an "Add to Actions" button. */
export function ListedFirst({ businessId, listed, add }: Props) {
  return (
    <Card data-testid="listed-first">
      <CardHeader>
        <CardTitle>Get listed here first</CardTitle>
        <CardDescription>Most used sites that skip you, with the fix.</CardDescription>
      </CardHeader>
      <CardContent>
        {listed.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="listed-first-empty">
            Every listing site AI used also named you. Keep those listings up to date.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {listed.map((s) => (
              <li key={s.host} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center" data-testid="listed-site">
                <div className="flex min-w-0 flex-1 gap-3">
                  <SiteIcon domain={s.host} name={s.host} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="truncate font-medium" title={s.host}>{s.host}</span>
                      <span className="text-xs text-text-hint">{s.kindLabel}</span>
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {s.used} {s.fix}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 pl-11 sm:pl-0">
                  <Badge variant={IMPACT[s.impact].variant} data-testid="impact">
                    <span className="sr-only">Impact: </span>
                    {IMPACT[s.impact].label}
                  </Badge>
                  <AddToActionsButton businessId={businessId} action={s.action} inActions={s.inActions} actionId={s.actionId} add={add} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
