"use client";

import { useActionState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";

type Props = { open: () => Promise<ActionResult<never>>; variant?: "default" | "outline" };

// On success the action redirects to Stripe's portal, so only a failure comes back here.
export function PortalButton({ open, variant = "outline" }: Props) {
  const [result, submit, pending] = useActionState(async () => open(), null);
  return (
    <form action={submit} className="flex flex-col items-start gap-2 sm:items-end">
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
        Manage card and invoices
      </Button>
      {result && !result.ok && (
        <p role="alert" className="max-w-[320px] text-[13px] text-low-text sm:text-right">
          {result.error}
        </p>
      )}
    </form>
  );
}
