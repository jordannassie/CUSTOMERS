import { ChevronLeft, ChevronRight, Inbox, SearchX, X } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { looksLikeCode, withoutCode } from "@/lib/submitted-text";
import AdminEmpty from "../../_components/admin-empty";
import { SpamBadge } from "../../_components/submitted-code";
import { formatDate, interestLabel, leadStage, stageLabel, stageVariant, type Lead } from "./lead-types";

export function LeadListEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      {filtered ? (
        <AdminEmpty icon={Inbox} title="No leads match these filters" className="w-full border-0">
          Clear the search or pick All in each filter to see every lead.
        </AdminEmpty>
      ) : (
        <AdminEmpty icon={Inbox} title="No leads yet" className="w-full border-0">
          A lead shows up here as soon as someone sends the contact form, the chat widget or the agency page form, or
          sends a brief for a paid AI video ad.
        </AdminEmpty>
      )}
    </div>
  );
}

export function LeadListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="m-4 rounded-md bg-low-bg px-4 py-3 text-low-text">
      <p className="text-[length:calc(14px*var(--px,1))] font-medium">The leads didn&apos;t load</p>
      <p className="mt-1 text-[length:calc(13px*var(--px,1))]">{message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/** A shared lead link (?lead=) for a lead that is gone or never existed. */
export function LeadNotFound({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end px-5 py-4">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="flex flex-1 items-start justify-center p-4">
        <AdminEmpty icon={SearchX} title="Lead not found" className="w-full border-0">
          This link points to a lead that is not here any more. Pick one from the list.
        </AdminEmpty>
      </div>
    </div>
  );
}

export function LeadRows({
  leads,
  selectedId,
  compact,
  unsaved,
  onOpen,
}: {
  leads: Lead[];
  selectedId: string | undefined;
  compact: boolean;
  /** Leads with an internal note typed but not saved yet. */
  unsaved: Record<string, string>;
  onOpen: (lead: Lead) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {leads.map((lead) => {
        const spam = looksLikeCode(lead.name, lead.company, lead.message, lead.website, lead.page_path);
        const stage = leadStage(lead);
        return (
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
                  <p className={cn("truncate text-[length:calc(14px*var(--px,1))]", lead.read_at ? "text-foreground" : "font-semibold")}>
                    {withoutCode(lead.name) || "No name"}
                  </p>
                  {/* Wraps instead of being cut off on a phone, but only at the "@" or a dot when it can, never mid-word
                      when it fits (admin audit 2026-11-12). */}
                  <p className="text-[length:calc(12px*var(--px,1))] wrap-anywhere text-muted-foreground">{lead.email}</p>
                  {lead.company && withoutCode(lead.company) && (
                    <p className="truncate text-[length:calc(12px*var(--px,1))] text-muted-foreground">{withoutCode(lead.company)}</p>
                  )}
                  {lead.handled_by && (
                    <p className="text-[length:calc(12px*var(--px,1))] wrap-anywhere text-text-hint">Handled by {lead.handled_by}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant="secondary">{interestLabel(lead.topic)}</Badge>
                <span className="text-[length:calc(12px*var(--px,1))] text-text-hint">
                  {formatDate(lead.created_at, true)}
                </span>
                <Badge variant={stageVariant(stage)}>{stageLabel(stage)}</Badge>
                {spam && <SpamBadge />}
                {lead.replied_at && <Badge variant="secondary">Replied</Badge>}
                {unsaved[lead.id] !== undefined && <Badge variant="mid">Note not saved</Badge>}
              </div>
            </div>
            {!compact && <p className="mt-2 line-clamp-1 w-full pl-4 text-left text-[length:calc(12px*var(--px,1))] text-muted-foreground">{withoutCode(lead.message)}</p>}
          </button>
        </li>
        );
      })}
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
      <span className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">
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
