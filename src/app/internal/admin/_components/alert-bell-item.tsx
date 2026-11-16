"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Bell, Bot, CreditCard, Gauge, ScanSearch, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Resolve } from "../_overview/open-alerts";

// One icon per kind of problem, so the list reads at a glance.
const ICONS: [RegExp, LucideIcon][] = [
  [/^webhook_|^paid_not_active|^schedule_lost|^topup_refund|stripe/, CreditCard],
  [/^anthropic_|^ai_fallback|^claude_|^provider_errors|openai|perplexity|anthropic/, Bot],
  [/^failed_scans|^stuck_jobs/, ScanSearch],
  [/^negative_balances/, Wallet],
  [/^daily_ai_cost/, Gauge],
  [/^service_check/, Activity],
];
export const iconFor = (kind: string): LucideIcon => ICONS.find(([re]) => re.test(kind))?.[1] ?? Bell;

// The icon's tint: orange for urgent and warning alike (owner, 2026-11-16: orange, no red), grey for the rest. The
// unread dot uses the same; "urgent" is still said to screen readers.
const TONE = { critical: "bg-mid-bg text-mid-text", warning: "bg-mid-bg text-mid-text", info: "bg-muted text-muted-foreground" } as const;
const DOT = { critical: "bg-mid", warning: "bg-mid", info: "bg-text-hint" } as const;
export type Tone = keyof typeof TONE;

export type BellLink = { label: string; href: string; external?: boolean };

/** One alert in the bell's box: an unread one has a dot, coloured like its icon. */
export function BellItem(props: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  when?: string;
  text: string;
  unread: boolean;
  link?: BellLink;
  onOpen: () => void;
  resolve?: { alertId: string; run: Resolve };
}) {
  const { icon: Icon, tone, title, when, text, unread, link, onOpen, resolve } = props;
  const [resolving, setResolving] = useState(false);
  const linkClass = "inline-flex w-fit items-center gap-1 rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <li className="relative flex gap-3 border-b border-border py-3 pr-4 pl-6 last:border-b-0" data-testid="alert-bell-item" data-unread={unread || undefined}>
      {unread && <span className={cn("absolute top-[18px] left-2.5 size-1.5 rounded-full", DOT[tone])} aria-label="Unread" />}
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", TONE[tone])} aria-hidden="true">
        <Icon className="size-4 stroke-[1.75]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[length:calc(12.5px*var(--px,1))]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[length:calc(13px*var(--px,1))] font-semibold text-foreground">
            {title}
            {tone === "critical" && <span className="sr-only"> (urgent)</span>}
          </p>
          {when && <span className="shrink-0 text-[length:calc(11px*var(--px,1))] text-text-hint tabular-nums">{when}</span>}
        </div>
        <p className="leading-snug text-muted-foreground">{text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {link &&
            (link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass} onClick={onOpen}>
                {link.label}
                <ArrowRight className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <Link href={link.href} className={linkClass} onClick={onOpen}>
                {link.label}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ))}
          {resolve && !resolving && (
            <button type="button" className="rounded-sm font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => setResolving(true)}>
              Resolve
            </button>
          )}
        </div>
        {resolve && resolving && <ResolveForm alertId={resolve.alertId} run={resolve.run} onCancel={() => setResolving(false)} />}
      </div>
    </li>
  );
}

/** What the admin did about it, saved in the audit log; the page refreshes and the alert leaves the list. */
function ResolveForm({ alertId, run, onCancel }: { alertId: string; run: Resolve; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (reason.length < 3) return setError("Say what you did, in at least 3 characters.");
    setError(null);
    startTransition(async () => {
      const result = await run({ alertId, reason });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form noValidate onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-foreground">
        What did you do about it?
      </label>
      <Textarea id={id} name="reason" rows={2} maxLength={500} placeholder="Saved in the audit log with your name" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="min-h-14 text-[length:calc(12.5px*var(--px,1))]" />
      {error && (
        <p id={`${id}-error`} className="text-low-text">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="xs" disabled={pending}>
          {pending ? "Resolving…" : "Resolve alert"}
        </Button>
        <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
