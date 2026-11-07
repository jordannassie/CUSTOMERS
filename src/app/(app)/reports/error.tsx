"use client";

import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";

export default function ReportsError({ retry }: { error: Error; retry: () => void }) {
  return (
    <PageContainer>
      <div role="alert" className="rounded-xl bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">This page could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your scans and saved reports are safe. Try again, and contact support if it keeps happening.
        </p>
        <Button className="mt-5 rounded-full" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
