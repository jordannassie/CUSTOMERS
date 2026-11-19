"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/** Runs every check live now (the page otherwise shows the last saved check, at most 15 minutes old). */
export default function RecheckButton({ recheck }: { recheck: () => Promise<unknown> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await recheck();
          router.refresh();
        })
      }
    >
      <RefreshCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
      {pending ? "Checking" : "Check again"}
    </Button>
  );
}
