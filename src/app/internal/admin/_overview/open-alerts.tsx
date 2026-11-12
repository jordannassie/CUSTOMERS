"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/modules/auth";
import type { AdminOverview } from "@/modules/admin";
import { cn } from "cn";
import Section, { Empty } from "../businesses/[id]/_components/section";

// Dates arrive formatted: the shared date helper lives beside server-only code.
export type AlertRowData = AdminOverview["openAlerts"][number] & { started: string; lastSeen: string; stale: boolean; serviceCheck: boolean };
type Resolve = (input: { alertId: string; reason: string }) => Promise<ActionResult<unknown>>;

const KIND_LABEL: Record<string, string> = {
  failed_scans: "Failed scans",
  stuck_jobs: "Stuck scans",
  webhook_failures: "Stripe payment updates",
  provider_errors: "AI tool errors",
  negative_balances: "Negative balances",
  daily_ai_cost: "AI cost",
  anthropic_credit: "Claude out of credit",
  ai_fallback: "ChatGPT backup in use",
  claude_unavailable: "Claude unavailable",
  paid_not_active: "Paid but still on trial",
  schedule_lost: "Scheduled change lost",
  topup_refund_unrecovered: "Refunded credits not taken back",
};
/** The alert's name in plain words; a kind this page does not know is "Other alert", never its internal code. */
export function alertKindLabel(kind: string, serviceCheck: boolean): string {
  return KIND_LABEL[kind] ?? (serviceCheck ? "Service check" : "Other alert");
}

const SEVERITY = {
  // The dashboard's light orange warning for urgent and warning alerts, grey for the rest.
  critical: { label: "Urgent", badge: "mid", rail: "border-l-mid" },
  warning: { label: "Warning", badge: "mid", rail: "border-l-mid/50" },
  info: { label: "Info", badge: "secondary", rail: "border-l-border" },
} as const;

export type OverdueData = { count: number; businesses: { id: string; name: string; due: string }[] };

/**
 * Open alerts and overdue scheduled scans as one slim bar ("2 open alerts · 1 urgent · 1 scheduled scan overdue") that
 * opens the full list (2026-11-10: the alert boxes pushed the numbers down). With nothing open, the usual empty note.
 */
export default function OpenAlerts({ rows, resolve, overdue = null }: { rows: AlertRowData[]; resolve: Resolve; overdue?: OverdueData | null }) {
  const [done, setDone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (rows.length === 0 && !overdue) {
    return (
      <Section title="Open alerts">
        <Empty>No open alerts. Failed scans, provider errors or a cost spike will show here, and admins get an email.</Empty>
      </Section>
    );
  }
  const urgent = rows.filter((r) => r.severity === "critical").length;
  const summary = [
    rows.length > 0 && `${rows.length} open ${rows.length === 1 ? "alert" : "alerts"}`,
    urgent > 0 && `${urgent} urgent`,
    overdue && `${overdue.count} scheduled ${overdue.count === 1 ? "scan" : "scans"} overdue`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label="Open alerts" className="flex flex-col gap-2" data-testid="open-alerts">
      {/* The admin's one orange warning, in the app's warning banner style (AppBanners); the list opens with Show. */}
      <div role="alert" className="flex items-center gap-2 rounded-md border border-mid/30 bg-mid-bg py-1.5 pr-1.5 pl-3 text-[length:calc(13px*var(--px,1))] text-mid-text">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 font-medium">{summary}</span>
        <span className="hidden text-xs sm:inline">Checked every 15 minutes</span>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm px-1 font-medium underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {expanded ? "Hide list" : "Show"}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      {expanded && (
        <ul id={listId} className="flex flex-col gap-2 text-[length:calc(13px*var(--px,1))]">
          {overdue && <OverdueRow overdue={overdue} />}
          {rows.map((a) => (
            <AlertRow key={a.id} alert={a} resolve={resolve} onResolved={() => setDone("Alert resolved and saved in the audit log.")} />
          ))}
        </ul>
      )}
      <p aria-live="polite" className="text-[length:calc(13px*var(--px,1))] text-foreground empty:hidden">
        {done}
      </p>
    </section>
  );
}

/** Businesses whose scheduled scan is more than a day late: no Resolve, it clears once they are scanned. */
function OverdueRow({ overdue }: { overdue: OverdueData }) {
  const more = overdue.count - overdue.businesses.length;
  return (
    <li className="flex flex-col gap-1 rounded-md border border-l-[3px] border-border border-l-mid bg-surface px-4 py-3" data-testid="overdue-scans">
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="mid">Check</Badge>
        <span className="font-medium text-muted-foreground">Scheduled scans overdue</span>
      </span>
      <p className="text-[length:calc(14px*var(--px,1))] text-foreground">
        {overdue.count === 1 ? "1 business has" : `${overdue.count} businesses have`} not been scanned for more than a day after
        their scheduled date. Scans are queued daily at 02:00 UTC; check the scan worker and the agency&apos;s credits.
      </p>
      <ul className="flex flex-col gap-0.5 text-text-hint">
        {overdue.businesses.map((b) => (
          <li key={b.id}>
            <Link href={`/internal/admin/businesses/${b.id}`} className="font-medium text-primary hover:underline">
              {b.name}
            </Link>{" "}
            due {b.due}
          </li>
        ))}
        {more > 0 && <li>and {more} more</li>}
      </ul>
    </li>
  );
}

function AlertRow({ alert, resolve, onResolved }: { alert: AlertRowData; resolve: Resolve; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasonId = useId();
  const fields = useFieldErrors<"reason">(reasonId);
  const severity = SEVERITY[alert.severity];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    setError(null);
    if (fields.show({ reason: reason.length < 3 ? "Say what you did, in at least 3 characters." : undefined })) return;
    startTransition(async () => {
      const result = await resolve({ alertId: alert.id, reason });
      if (result.ok) onResolved();
      else setError(result.error);
    });
  }

  return (
    <li className={cn("flex flex-col gap-3 rounded-md border border-l-[3px] border-border bg-surface px-4 py-3", severity.rail)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={severity.badge}>{severity.label}</Badge>
            <span className="font-medium text-muted-foreground">{alertKindLabel(alert.kind, alert.serviceCheck)}</span>
          </span>
          <p className="text-[length:calc(14px*var(--px,1))] break-words text-foreground">{alert.message}</p>
          <p className="text-text-hint">
            Started {alert.started}. Last seen {alert.lastSeen}.{alert.stale ? " Nothing new since." : ""}
          </p>
          {alert.links.length > 0 && <AlertLinks links={alert.links} />}
        </div>
        {!open && (
          <Button type="button" variant="outline" size="sm" className="w-fit shrink-0" onClick={() => setOpen(true)}>
            Resolve
          </Button>
        )}
      </div>

      {open && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-2 border-t border-border pt-3">
          <Label htmlFor={reasonId}>What did you do about it?</Label>
          <Textarea
            id={reasonId}
            name="reason"
            maxLength={500}
            rows={2}
            placeholder="Saved in the audit log with your name"
            onChange={() => fields.clear("reason")}
            {...fields.fieldProps("reason")}
          />
          <FieldMessage id={fields.idOf("reason")} message={fields.errors.reason} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Resolving…" : "Resolve alert"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-low-text">{error}</p>}
        </form>
      )}
    </li>
  );
}

/** Where to go about the alert: an admin page, or the Stripe dashboard in a new tab. */
function AlertLinks({ links }: { links: AlertRowData["links"] }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 font-medium">
      {links.map((l) =>
        l.external ? (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {l.label}
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <Link key={l.href} href={l.href} className="text-primary hover:underline">
            {l.label}
          </Link>
        ),
      )}
    </p>
  );
}
