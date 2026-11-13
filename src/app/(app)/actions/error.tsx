"use client";

import { PageError } from "@/components/app/PageError";

export default function OpportunitiesError({ retry }: { error: Error; retry: () => void }) {
  return <PageError safe="Your scans and credits are safe." retry={retry} />;
}
