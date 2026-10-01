import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTEREST_LABELS, statusLabel, statusVariant, type Lead } from "./lead-types";

export function LeadListEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted text-text-hint">
        <Inbox aria-hidden className="size-5" />
      </div>
      <p className="text-[14px] font-medium text-foreground">No leads found</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {filtered ? "Try adjusting your filters." : "Contact submissions will appear here."}
      </p>
    </div>
  );
}

export function LeadListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="m-4 rounded-md bg-low-bg px-4 py-3 text-low-text">
      <p className="text-[14px] font-medium">Failed to load leads</p>
      <p className="mt-1 text-[13px]">{message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function LeadRows({
  leads,
  selectedId,
  compact,
  onOpen,
}: {
  leads: Lead[];
  selectedId: string | undefined;
  compact: boolean;
  onOpen: (lead: Lead) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {leads.map((lead) => (
        <li key={lead.id}>
          <button
            type="button"
            onClick={() => onOpen(lead)}
            aria-current={selectedId === lead.id ? "true" : undefined}
            className={cn(
              "w-full px-4 py-4 text-left transition-colors duration-150 ease-out hover:bg-muted",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              selectedId === lead.id && "bg-primary-tint hover:bg-primary-tint",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {!lead.read_at && (
                  <span
                    role="img"
                    aria-label="Unread"
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  />
                )}
                <div className="min-w-0">
                  <p className={cn("truncate text-[14px]", lead.read_at ? "text-foreground" : "font-semibold")}>
                    {lead.name}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">{lead.email}</p>
                  {lead.company && <p className="truncate text-[12px] text-muted-foreground">{lead.company}</p>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant="secondary">{INTEREST_LABELS[lead.topic] ?? lead.topic}</Badge>
                <span className="text-[12px] text-text-hint">
                  {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <Badge variant={statusVariant(lead.status)}>{statusLabel(lead.status)}</Badge>
              </div>
            </div>
            {!compact && <p className="mt-2 line-clamp-1 w-full pl-4 text-left text-[12px] text-muted-foreground">{lead.message}</p>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LeadPagination({
  page,
  pages,
  loading,
  onGo,
}: {
  page: number;
  pages: number;
  loading: boolean;
  onGo: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-4">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Previous page"
        disabled={page <= 1 || loading}
        onClick={() => onGo(page - 1)}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Button>
      <span className="text-[13px] text-muted-foreground">
        Page {page} of {pages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={page >= pages || loading}
        onClick={() => onGo(page + 1)}
      >
        <ChevronRight aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
