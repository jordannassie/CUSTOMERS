"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "./confirm-dialog";

/**
 * Delete for a lead or a feature request (owner, 2026-11-16): asks once, says it cannot be undone, then runs `onDelete`
 * (true when it was deleted). Admin activity keeps a note that it was deleted, never what it said.
 */
export default function DeleteRecord({ what, onDelete, disabled = false }: { what: string; onDelete: () => Promise<boolean>; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const deleted = await onDelete().catch(() => false);
    // On success the record leaves the page; on failure the button is usable again and the page says why.
    if (!deleted) setPending(false);
  }

  return (
    <>
      <Button type="button" variant="ghost" disabled={disabled || pending} onClick={() => setOpen(true)} data-testid="delete-record">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
        {pending ? "Deleting…" : `Delete ${what}`}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete this ${what}?`}
        message={`It is removed for good and can't be brought back. Admin activity keeps a note that you deleted it, not what it said.`}
        confirmLabel={`Delete ${what}`}
        onConfirm={run}
      />
    </>
  );
}
