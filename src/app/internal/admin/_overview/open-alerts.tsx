"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/modules/auth";
import type { OpenAlert } from "@/modules/admin";
import { cn } from "cn";
import Section, { Empty } from "../businesses/[id]/_components/section";

// Dates arrive formatted: the shared date helper lives beside server-only code.
export type AlertRowData = OpenAlert & { started: string; lastSeen: string; stale: boolean; serviceCheck: boolean };
type Resolve = (input: { alertId: string; reason: string }) => Promise<ActionResult<unknown>>;

const KIND_LABEL: Record<string, string> = {
  failed_scans: "Failed scans",
  stuck_jobs: "Stuck scans",
  webhook_failures: "Stripe webhooks",
  provider_errors: "Provider errors",
  negative_balances: "Negative balances",
  daily_ai_cost: "AI cost",
  anthropic_credit: "Anthropic out of credit",
  ai_fallback: "ChatGPT backup in use",
  claude_unavailable: "Claude unavailable",
  paid_not_active: "Paid but still on trial",
  schedule_lost: "Scheduled change lost",
  topup_refund_unrecovered: "Refunded credits not taken back",
};
const SEVERITY = {
  critical: { label: "Urgent", badge: "low", rail: "border-l-low" },
  warning: { label: "Warning", badge: "mid", rail: "border-l-mid" },
  info: { label: "Info", badge: "tint", rail: "border-l-primary" },
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
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-left text-[13px] outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <AlertTriangle className={cn("size-4 shrink-0", urgent > 0 ? "text-low" : "text-muted-foreground")} aria-hidden="true" />
        <span className="min-w-0 flex-1 font-medium">{summary}</span>
        <span className="hidden text-xs text-text-hint sm:inline">Checked every 15 minutes</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          {expanded ? "Hide" : "Show"}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {expanded && (
        <ul id={listId} className="flex flex-col gap-2 text-[13px]">
          {overdue && <OverdueRow overdue={overdue} />}
          {rows.map((a) => (
            <AlertRow key={a.id} alert={a} resolve={resolve} onResolved={() => setDone("Alert resolved and saved in the audit log.")} />
          ))}
        </ul>
      )}
      <p aria-live="polite" className="text-[13px] text-foreground empty:hidden">
        {done}
      </p>
    </section>
  );
}

/** Businesses whose scheduled scan is more than a day late: no Resolve, it clears once they are scanned. */
function OverdueRow({ overdue }: { overdue: OverdueData }) {
  const more = overdue.count - overdue.businesses.length;
  return (
    <li className="flex flex-col gap-1 rounded-md border border-l-[3px] border-border border-l-primary bg-surface px-4 py-3" data-testid="overdue-scans">
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="tint">Check</Badge>
        <span className="font-medium text-muted-foreground">Scheduled scans overdue</span>
      </span>
      <p className="text-[14px] text-foreground">
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
            <span className="font-medium text-muted-foreground">{KIND_LABEL[alert.kind] ?? (alert.serviceCheck ? "Service check" : alert.kind)}</span>
          </span>
          <p className="text-[14px] break-words text-foreground">{alert.message}</p>
          <p className="text-text-hint">
            Started {alert.started}. Last seen {alert.lastSeen}.{alert.stale ? " Nothing new since." : ""}
          </p>
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
