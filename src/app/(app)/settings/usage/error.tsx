"use client";

import { PageError } from "@/components/app/PageError";

export default function UsageError({ retry }: { error: Error; retry: () => void }) {
  return <PageError title="Usage could not load" safe="Your credits are safe; only this page failed to load." retry={retry} />;
}
