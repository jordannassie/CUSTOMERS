"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

export default function RecheckButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      <RefreshCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
      {pending ? "Checking" : "Check again"}
    </Button>
  );
}
