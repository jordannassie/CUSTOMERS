"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Loads the page's data again, for a part that failed (Google details on Compare). */
export function RetryButton({ label = "Retry" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="outline" size="sm" className="w-fit" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
      {label}
    </Button>
  );
}
