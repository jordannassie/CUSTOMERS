"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// A step that fails to load keeps the saved progress; trying again reloads the same step.
export default function StepError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">This step didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Everything you saved so far is kept. Try again, and if it keeps happening, contact support.</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>
          <RotateCw aria-hidden />
          Try again
        </Button>
        <Button asChild variant="ghost">
          <a href="/contact?topic=support">Contact support</a>
        </Button>
      </div>
    </div>
  );
}
