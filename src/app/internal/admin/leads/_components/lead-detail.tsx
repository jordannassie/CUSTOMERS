"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appFetch } from "@/lib/session-expired";
import { INTEREST_LABELS, SOURCE_LABELS, STATUS_OPTIONS, formatDate, type Lead } from "./lead-types";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }
  return (
    <Button type="button" variant="ghost" size="xs" onClick={handleCopy} title={copied ? "Copied!" : `Copy ${label}`}>
      {copied ? <Check aria-hidden className="size-3" /> : <Copy aria-hidden className="size-3" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-[12px] font-medium text-text-hint">{label}</p>
      <div className="text-[13px] text-foreground">{children}</div>
    </div>
  );
}

export function LeadDetail({
  lead,
  onUpdate,
  onClose,
}: {
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await appFetch("/api/internal/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...payload }),
      });
      if (res.ok) {
        if (payload.mark_read) onUpdate(lead.id, { read_at: new Date().toISOString() });
        if (payload.mark_unread) onUpdate(lead.id, { read_at: null });
        if (payload.status) onUpdate(lead.id, { status: payload.status as string });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{INTEREST_LABELS[lead.topic] ?? lead.topic}</Badge>
          {!lead.read_at && <Badge variant="tint">Unread</Badge>}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold text-foreground">{lead.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`mailto:${lead.email}`} className="text-[13px] text-primary hover:underline">{lead.email}</a>
            <CopyButton text={lead.email} label="Copy email" />
          </div>
          {lead.company && <p className="text-[13px] text-muted-foreground">{lead.company}</p>}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="block text-[13px] text-foreground">{lead.phone}</a>
          )}
          {lead.website && (
            <a
              href={/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[13px] text-primary hover:underline"
            >
              {lead.website}
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Received">{formatDate(lead.created_at)}</Field>
          <Field label="Source">{SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "-"}</Field>
          {lead.page_path && (
            <Field label="Page" className="col-span-2">
              <span className="block truncate">{lead.page_path}</span>
            </Field>
          )}
        </div>

        <Field label="Message">
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted px-4 py-3 leading-relaxed">
            {lead.message}
          </p>
        </Field>

        <Field label="Status">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const current = lead.status === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={current}
                  disabled={saving || current}
                  onClick={() => patch({ status: opt.value })}
                  className={cn(current && "border-primary/30 bg-primary-tint text-primary-hover disabled:opacity-100")}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </Field>

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <a href={`mailto:${lead.email}?subject=Re: your Customers.Direct inquiry`}>Reply by email</a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => (lead.read_at ? patch({ mark_unread: true }) : patch({ mark_read: true }))}
          >
            {lead.read_at ? "Mark as unread" : "Mark as read"}
          </Button>
        </div>
      </div>
    </div>
  );
}
