"use client";

import { PageError } from "@/components/app/PageError";

export default function ReportsError({ retry }: { error: Error; retry: () => void }) {
  return <PageError safe="Your scans and saved reports are safe." retry={retry} />;
}
