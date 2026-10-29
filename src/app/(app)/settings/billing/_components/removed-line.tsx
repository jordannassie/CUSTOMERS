import { Badge } from "@/components/ui/badge";

/** A business deleted during the trial: never billed, so no price and no actions (2026-10-15). */
export function RemovedLine({ id, name }: { id: string; name: string }) {
  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4 text-muted-foreground" data-testid={`plan-line-${id}`}>
      <p className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-[15px] line-through decoration-border">{name}</span>
        <Badge variant="secondary">Deleted</Badge>
      </p>
      <p className="shrink-0 text-right text-[13px]" data-testid="not-charged">
        Removed, not charged
      </p>
    </li>
  );
}
