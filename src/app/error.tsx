"use client";

import { CrashPage } from "@/components/site/CrashPage";

export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <CrashPage {...props} />;
}
