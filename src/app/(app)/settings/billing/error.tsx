"use client";

import { PageError } from "@/components/app/PageError";

export default function BillingError({ retry }: { error: Error; retry: () => void }) {
  return <PageError safe="Your plan and card are unchanged." retry={retry} />;
}
