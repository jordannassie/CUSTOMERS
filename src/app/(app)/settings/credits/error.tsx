"use client";

import { PageError } from "@/components/app/PageError";

export default function BuyCreditsError({ retry }: { error: Error; retry: () => void }) {
  return <PageError safe="Nothing was charged." retry={retry} />;
}
