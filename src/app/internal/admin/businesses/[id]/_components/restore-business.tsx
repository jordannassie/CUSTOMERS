"use client";

import { useState } from "react";
import type { ActionResult } from "@/modules/auth";
import ActionCard from "../../../agencies/[id]/_components/action-card";

type Props = {
  businessId: string;
  /** Why it cannot be restored (waiting period over, account deleted), or null when it can. */
  blocked: string | null;
  restoreBusiness: (input: { businessId: string; reason: string }) => Promise<ActionResult<null>>;
};

// MVP_SPEC 23: a deleted business can be restored by an admin within its waiting period, like an account.
export default function RestoreBusiness({ businessId, blocked, restoreBusiness }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border bg-surface" data-testid="restore-business">
      <ActionCard
        title="Restore business"
        note="Brings back the business with its questions, competitors and results. Share links stay off, and its plan still ends as scheduled, so the owner picks a plan again to keep scanning it."
        openLabel="Restore business"
        submitLabel="Restore business"
        pendingLabel="Restoring…"
        successText="Business restored."
        blocked={blocked}
        open={open}
        onOpenChange={setOpen}
        run={(_form, reason) => restoreBusiness({ businessId, reason })}
      />
    </div>
  );
}
