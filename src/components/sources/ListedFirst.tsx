import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SiteIcon } from "@/components/app/SiteIcon";
import type { Impact } from "@/modules/sources/listings";
import type { ListedSite } from "@/modules/sources/rows";
import { AddToActionsButton, type AddToActions } from "./AddToActionsButton";
import { SectionCard } from "./SectionCard";

const IMPACT: Record<Impact, { label: string; variant: "low" | "mid" | "secondary" }> = {
  high: { label: "High", variant: "low" },
  medium: { label: "Medium", variant: "mid" },
  low: { label: "Low", variant: "secondary" },
};

type Props = { businessId: string; listed: ListedSite[]; add: AddToActions };

/** The most used sites that skip the business, each with its fix and an "Add to Actions" button. */
export function ListedFirst({ businessId, listed, add }: Props) {
  return (
    <SectionCard
      title="Get listed here first"
      aside={
        <Link href="/actions" className="text-[12.5px] font-medium text-primary hover:underline">
          Open Actions
        </Link>
      }
      testId="listed-first"
    >
      {listed.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted-foreground sm:px-[18px]" data-testid="listed-first-empty">
          Every listing site AI used also named you. Keep those listings up to date.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-muted">
          {listed.map((s) => (
            <li
              key={s.host}
              className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-[18px]"
              data-testid="listed-site"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <SiteIcon domain={s.host} name={s.host} size="sm" className="mt-px" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="flex min-w-0 items-baseline gap-2 text-[13px]">
                    <span className="truncate font-medium" title={s.host}>{s.host}</span>
                    <span className="shrink-0 text-xs text-text-hint">{s.kindLabel}</span>
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground" title={`${s.used} ${s.fix}`}>
                    {s.used} {s.fix}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-[34px] sm:pl-0">
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
    </SectionCard>
  );
}
