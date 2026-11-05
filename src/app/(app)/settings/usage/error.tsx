"use client";

import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";

export default function UsageError({ retry }: { error: Error; retry: () => void }) {
  return (
    <PageContainer>
      <div role="alert" className="rounded-xl bg-surface p-8 text-center">
        <h1 className="font-serif text-2xl font-normal">Usage could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your credits are safe; only this page failed to load. Try again, and contact support if it keeps happening.
        </p>
        <Button className="mt-5" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
