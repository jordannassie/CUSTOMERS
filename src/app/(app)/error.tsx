"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";

// Keeps the sidebar in place so the user can move to another page.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <div role="alert" className="rounded-md border border-border bg-surface p-8">
        <h1 className="text-lg font-semibold tracking-[-0.02em]">This page didn&apos;t load</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Something went wrong on our side. Your scans, credits and settings are safe. Try again, and if it keeps
          happening, contact us{error.digest ? " with the reference below" : ""}.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-[13px] text-hint">
            Reference for support: <span className="font-mono text-foreground">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </PageContainer>
  );
}
