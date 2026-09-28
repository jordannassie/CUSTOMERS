"use client";

import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";

export default function OpportunitiesError({ retry }: { error: Error; retry: () => void }) {
  return (
    <PageContainer>
      <div role="alert" className="rounded-md border border-border bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold tracking-[-0.02em]">This page could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your scans and credits are safe. Try again, and contact support if it keeps happening.
        </p>
        <Button className="mt-5" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
