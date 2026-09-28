"use client";

import { useId, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/modules/auth";
import type { OpenAlert } from "@/modules/admin";
import { cn } from "cn";
import Section, { Empty } from "../businesses/[id]/_components/section";

// Dates arrive formatted: the shared date helper lives beside server-only code.
export type AlertRowData = OpenAlert & { started: string; lastSeen: string };
type Resolve = (input: { alertId: string; reason: string }) => Promise<ActionResult<unknown>>;

const KIND_LABEL: Record<string, string> = {
  failed_scans: "Failed scans",
  stuck_jobs: "Stuck scans",
  webhook_failures: "Stripe webhooks",
  provider_errors: "Provider errors",
  negative_balances: "Negative balances",
  daily_ai_cost: "AI cost",
};
const SEVERITY = {
  critical: { label: "Urgent", badge: "low", rail: "border-l-low" },
  warning: { label: "Warning", badge: "mid", rail: "border-l-mid" },
  info: { label: "Info", badge: "tint", rail: "border-l-primary" },
} as const;

export default function OpenAlerts({ rows, resolve }: { rows: AlertRowData[]; resolve: Resolve }) {
  const [done, setDone] = useState<string | null>(null);
  const note = rows.length > 0 ? `${rows.length} open. Checked every 15 minutes.` : undefined;

  return (
    <Section title="Open alerts" note={note}>
      {rows.length === 0 ? (
        <Empty>No open alerts. Failed scans, provider errors or a cost spike will show here, and admins get an email.</Empty>
      ) : (
        <ul className="flex flex-col gap-2 text-[13px]">
          {rows.map((a) => (
            <AlertRow key={a.id} alert={a} resolve={resolve} onResolved={() => setDone("Alert resolved and saved in the audit log.")} />
          ))}
        </ul>
      )}
      <p aria-live="polite" className="text-[13px] text-good-text empty:hidden">
        {done}
      </p>
    </Section>
  );
}

function AlertRow({ alert, resolve, onResolved }: { alert: AlertRowData; resolve: Resolve; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasonId = useId();
  const severity = SEVERITY[alert.severity];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    setError(null);
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
            <span className="font-medium text-muted-foreground">{KIND_LABEL[alert.kind] ?? alert.kind}</span>
          </span>
          <p className="text-[14px] break-words text-foreground">{alert.message}</p>
          <p className="text-text-hint">
            Started {alert.started}. Last seen {alert.lastSeen}.
          </p>
        </div>
        {!open && (
          <Button type="button" variant="outline" size="sm" className="w-fit shrink-0" onClick={() => setOpen(true)}>
            Resolve
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="flex flex-col gap-2 border-t border-border pt-3">
          <Label htmlFor={reasonId}>What did you do about it?</Label>
          <textarea
            id={reasonId}
            name="reason"
            required
            minLength={3}
            maxLength={500}
            rows={2}
            placeholder="Saved in the audit log with your name"
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-[14px] outline-none placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
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
