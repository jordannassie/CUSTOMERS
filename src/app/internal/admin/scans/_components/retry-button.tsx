"use client";

import { useTransition } from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";

type Retry = (input: { jobId: string }) => Promise<ActionResult<{ jobId: string }>>;

export default function RetryButton({ jobId, businessName, retry }: { jobId: string; businessName: string; retry: Retry }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Retry scan for ${businessName}`}
      onClick={() =>
        startTransition(async () => {
          const result = await retry({ jobId });
          if (result.ok) toast.success(`Scan for ${businessName} is queued again.`);
          else toast.error(result.error);
        })
      }
    >
      <RotateCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
      {pending ? "Retrying" : "Retry"}
    </Button>
  );
}
