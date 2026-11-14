"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appFetch } from "@/lib/session-expired";
import { looksLikeCode, websiteHref, withoutCode } from "@/lib/submitted-text";
import { CodeNotice } from "../../_components/submitted-code";
import { LeadFollowUp } from "./lead-followup";
import { STATUS_OPTIONS, formatDate, interestLabel, leadStage, sourceLabel, stageStatus, type Lead } from "./lead-types";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy didn't work. Select the email and copy it yourself.");
    }
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy} title={copied ? "Copied" : `Copy ${label}`}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-[length:calc(12px*var(--px,1))] font-medium text-text-hint">{label}</p>
      <div className="text-[length:calc(13px*var(--px,1))] text-foreground">{children}</div>
    </div>
  );
}

export function LeadDetail({
  lead,
  admins,
  draft,
  onDraft,
  onUpdate,
  onClose,
}: {
  lead: Lead;
  admins: string[];
  /** The internal note typed but not saved yet, kept per lead by the page. */
  draft: string | undefined;
  onDraft: (text: string | null) => void;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  // The Status button that is on: an opened lead is still New, a replied one Contacted.
  const currentStatus = stageStatus(leadStage(lead));

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    try {
      const res = await appFetch("/api/internal/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Marking as replied may also have moved the lead from New to Contacted.
      const saved = (await res.json().catch(() => null)) as { status?: string | null } | null;
      if (saved?.status && !payload.status) onUpdate(lead.id, { status: saved.status });
      if (payload.mark_read) onUpdate(lead.id, { read_at: new Date().toISOString() });
      if (payload.mark_unread) onUpdate(lead.id, { read_at: null });
      if (payload.status) onUpdate(lead.id, { status: payload.status as string });
      if (typeof payload.handled_by === "string") onUpdate(lead.id, { handled_by: payload.handled_by || null });
      if (typeof payload.replied === "boolean") onUpdate(lead.id, { replied_at: payload.replied ? new Date().toISOString() : null });
      if (typeof payload.admin_notes === "string") onUpdate(lead.id, { admin_notes: payload.admin_notes.trim() || null });
      return true;
    } catch {
      // The lead keeps what it showed before, so the screen never claims a change that was not saved.
      toast.error(payload.status ? "The status was not saved. Try again." : "That change was not saved. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{interestLabel(lead.topic)}</Badge>
          {!lead.read_at && <Badge variant="tint">Unread</Badge>}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {looksLikeCode(lead.name, lead.company, lead.message, lead.website, lead.page_path) && (
          <CodeNotice
            what="message"
            original={{ Name: lead.name, Company: lead.company, Website: lead.website, Page: lead.page_path, Message: lead.message }}
          />
        )}
        <div className="flex flex-col gap-1">
          <h2 className="text-[length:calc(15px*var(--px,1))] font-semibold text-foreground">{withoutCode(lead.name) || "No name"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`mailto:${lead.email}`} className="min-w-0 text-[length:calc(13px*var(--px,1))] wrap-anywhere text-primary hover:underline">{lead.email}</a>
            <CopyButton text={lead.email} label="Copy email" />
          </div>
          {/* Labelled, so a short company or phone ("Co", "123") never reads as a stray word (admin audit 2026-11-12). */}
          {lead.company && withoutCode(lead.company) && (
            <p className="text-[length:calc(13px*var(--px,1))] break-words text-muted-foreground">
              Company: <span className="text-foreground">{withoutCode(lead.company)}</span>
            </p>
          )}
          {lead.phone && (
            <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">
              Phone:{" "}
              <a href={`tel:${lead.phone}`} className="text-foreground hover:underline">{lead.phone}</a>
            </p>
          )}
          {/* Only a real web address becomes a link; anything else (a script URL from a security test) doesn't show. */}
          {websiteHref(lead.website) && (
            <a
              href={websiteHref(lead.website)!}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[length:calc(13px*var(--px,1))] text-primary hover:underline"
            >
              {lead.website}
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Received">{formatDate(lead.created_at, true)}</Field>
          <Field label="Source">{sourceLabel(lead.source)}</Field>
          {lead.page_path && (
            <Field label="Page" className="col-span-2">
              <span className="block truncate">{withoutCode(lead.page_path)}</span>
            </Field>
          )}
        </div>

        <Field label="Message">
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted px-4 py-3 leading-relaxed">
            {withoutCode(lead.message) || "No message"}
          </p>
        </Field>

        <Field label="Status">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const current = currentStatus === opt.value;
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
          {/* The list says "Opened" for a New lead someone has read; say the same here, so the two agree. */}
          {leadStage(lead) === "opened" && (
            <p className="text-[length:calc(12px*var(--px,1))] text-text-hint">Opened, not answered yet. It stays New until you mark it Contacted.</p>
          )}
        </Field>

        <LeadFollowUp key={lead.id} lead={lead} admins={admins} saving={saving} save={patch} draft={draft} onDraft={onDraft} />

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <a href={`mailto:${lead.email}?subject=Re: your Customers.Direct inquiry`}>Reply by email</a>
          </Button>
          <p className="text-center text-[length:calc(12px*var(--px,1))] text-text-hint">
            {lead.replied_at ? "Marked as replied." : "Mark as replied after you send it."}
          </p>
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
