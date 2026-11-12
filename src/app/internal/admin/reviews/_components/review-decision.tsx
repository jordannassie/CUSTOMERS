"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { moderateAppReviewAction } from "@/modules/apps-directory/review-actions";
import ConfirmDialog from "../../_components/confirm-dialog";

/** Approve, Reject or Remove one review, with a note for its history. Remove asks first (admin audit 2026-11-12). */
export function ReviewDecision({ reviewId, title }: { reviewId: string; title: string }) {
  const form = useRef<HTMLFormElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <form ref={form} action={moderateAppReviewAction} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-note">Note</Label>
        <Input id="review-note" name="note" maxLength={500} placeholder="Optional. Only admins see it, in the history below." className="placeholder:text-text-hint" />
      </div>
      <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">
        Reject sends it back: the writer can edit it and send it again. Remove takes it down for good, for spam or abuse.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button name="decision" value="approve">Approve</Button>
        <Button name="decision" value="reject" variant="outline">Reject</Button>
        <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Remove</Button>
        {/* The real Remove, sent only from the confirm dialog. */}
        <button ref={removeButton} type="submit" name="decision" value="remove" hidden aria-hidden tabIndex={-1} />
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Remove this review?"
        message={`"${title}" comes off /apps for good. The writer cannot edit it back; they would have to write a new one.`}
        confirmLabel="Remove review"
        onConfirm={() => form.current?.requestSubmit(removeButton.current)}
      />
    </form>
  );
}
