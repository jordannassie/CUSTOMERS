"use client";

import { useRouter } from "next/navigation";
import { CompetitorPicker, type CompetitorPickerProps } from "./CompetitorPicker";

// MVP_SPEC 3.1 step 5: the B-35 picker, moving the wizard on once the list is saved.
export function CompetitorsStep(props: Omit<CompetitorPickerProps, "onSaved" | "saveLabel" | "backHref">) {
  const router = useRouter();
  return (
    <CompetitorPicker
      {...props}
      saveLabel="Continue"
      backHref="/onboarding/details"
      onSaved={() => router.push("/onboarding/questions")}
    />
  );
}
