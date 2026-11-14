"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Keeps the admin menu in place so the admin can move to another page (REL-06).
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col px-4 py-4 sm:px-6 sm:py-5">
      <div role="alert" className="rounded-md border border-border bg-surface p-8" data-testid="admin-error">
        <h1 className="text-lg font-semibold tracking-[-0.02em]">This page didn&apos;t load</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Something went wrong reading this page. Nothing was changed. Try again, and if it keeps happening, look up the
          reference below in the server log.
        </p>
        <div className="mt-5">
          <Button onClick={() => retry()}>Try again</Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-[length:calc(13px*var(--px,1))] text-text-hint">
            Reference: <span className="font-mono text-foreground">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
