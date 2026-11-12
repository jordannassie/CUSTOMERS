"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, type Lead } from "./lead-types";

const NOBODY = "__nobody";

/**
 * Who handles the lead, whether someone replied, and an internal note (admin review 2026-11-12): without them a team
 * could not tell which leads were answered. `save` sends one change to the leads API, which keeps it in the history.
 */
export function LeadFollowUp({
  lead,
  admins,
  saving,
  save,
  draft,
  onDraft,
}: {
  lead: Lead;
  admins: string[];
  saving: boolean;
  save: (payload: { handled_by?: string; replied?: boolean; admin_notes?: string }) => Promise<boolean>;
  /** A note typed earlier and not saved: kept by the page, so opening another lead or closing this one keeps it. */
  draft: string | undefined;
  onDraft: (text: string | null) => void;
}) {
  const savedNotes = lead.admin_notes ?? "";
  const notes = draft ?? savedNotes;
  const dirty = notes.trim() !== savedNotes.trim();
  const ids = { handler: useId(), notes: useId() };
  // A handler no longer in ADMIN_EMAILS still shows, so the select never hides who it was.
  const options = [...new Set([...admins, ...(lead.handled_by ? [lead.handled_by] : [])])];

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <p className="text-[length:calc(13px*var(--px,1))] font-semibold">Follow-up</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.handler}>Handled by</Label>
        <Select
          id={ids.handler}
          value={lead.handled_by ?? NOBODY}
          onValueChange={(v) => save({ handled_by: v === NOBODY ? "" : v })}
          options={[{ value: NOBODY, label: "Nobody yet" }, ...options.map((email) => ({ value: email, label: email }))]}
          placeholder="Nobody yet"
          disabled={saving}
          className="h-9 text-[length:calc(14px*var(--px,1))] md:text-[length:calc(14px*var(--px,1))]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[length:calc(13px*var(--px,1))]">
        {lead.replied_at ? (
          <>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Check aria-hidden className="size-4 text-primary" />
              Replied {formatDate(lead.replied_at, true)}
            </span>
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => save({ replied: false })}>
              Undo
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => save({ replied: true })}>
            Mark as replied
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.notes}>Internal notes</Label>
        <Textarea
          id={ids.notes}
          value={notes}
          maxLength={4000}
          rows={3}
          placeholder="Only admins see this. For example: called back, wants a demo next week."
          onChange={(e) => onDraft(e.target.value.trim() === savedNotes.trim() ? null : e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={saving || !dirty}
            onClick={async () => {
              if (await save({ admin_notes: notes })) onDraft(null);
            }}
          >
            Save notes
          </Button>
          {dirty && (
            <>
              <span className="text-[length:calc(12px*var(--px,1))] text-mid-text">Not saved yet</span>
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => onDraft(null)}>
                Discard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
