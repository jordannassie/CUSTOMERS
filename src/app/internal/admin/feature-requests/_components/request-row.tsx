import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { looksLikeCode, withoutCode } from "@/lib/submitted-text";
import { CodeNotice, SpamBadge } from "../../_components/submitted-code";
import { STATUS_LABELS, StatusBadge, formatDate, type FeatureRequest, type Status } from "./request-parts";

interface Props {
  req: FeatureRequest;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onStatus: (status: Status) => void;
}

export function RequestRow({ req, expanded, saving, onToggle, onStatus }: Props) {
  const panelId = `feature-request-${req.id}`;
  const spam = looksLikeCode(req.title, req.description, req.pageContext);
  const title = withoutCode(req.title) || "No title";
  const page = req.pageContext ? withoutCode(req.pageContext) || "-" : "-";
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="grid min-w-0 flex-1 gap-1 md:grid-cols-[1fr_calc(180px*var(--px,1))_calc(190px*var(--px,1))] md:items-center md:gap-3">
          <span className="min-w-0">
            <span className="block truncate text-[length:calc(14px*var(--px,1))] font-medium" title={title}>{title}</span>
            <span className="block truncate text-[length:calc(13px*var(--px,1))] text-text-hint">
              {req.email}
              {req.businessName && `, ${req.businessName}`}
            </span>
          </span>
          <span className="truncate text-[length:calc(13px*var(--px,1))] text-text-hint" title={page}>{page}</span>
          <span className="text-[length:calc(13px*var(--px,1))] text-text-hint">{formatDate(req.createdAt, true)}</span>
        </span>
        {/* Fixed width so the date column lines up whatever the badge says. */}
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:min-w-32">
          {spam && <SpamBadge />}
          <StatusBadge status={req.status} />
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-text-hint transition-transform duration-150 ease-out motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          />
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-border bg-muted px-4 py-4">
          {spam && (
            <div className="mb-4">
              <CodeNotice what="request" original={{ Title: req.title, Page: req.pageContext, Description: req.description }} />
            </div>
          )}
          <p className="mb-2 text-[length:calc(12px*var(--px,1))] font-medium text-muted-foreground">Description</p>
          <p className="mb-5 text-[length:calc(14px*var(--px,1))] leading-relaxed whitespace-pre-wrap">{withoutCode(req.description) || "No description"}</p>

          <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            <Meta label="User" value={req.email} />
            {req.businessName && <Meta label="Business" value={req.businessName} />}
            {req.pageContext && <Meta label="Page" value={page} />}
            <Meta label="Submitted" value={formatDate(req.createdAt, true)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">Update status:</span>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => {
              const current = req.status === s;
              return (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={current}
                  disabled={current || saving}
                  onClick={() => onStatus(s)}
                  className={cn(current && "border-primary/30 bg-primary-tint text-primary-hover disabled:opacity-100")}
                >
                  {STATUS_LABELS[s]}
                </Button>
              );
            })}
            {saving && <span className="ml-1 text-[length:calc(13px*var(--px,1))] text-text-hint">Saving…</span>}
          </div>
        </div>
      )}
    </li>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 break-words">
      {label}: <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}
