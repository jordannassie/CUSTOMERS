"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompetitorPicker, type CompetitorPickerProps } from "./CompetitorPicker";

// MVP_SPEC 3.1 step 5: the B-35 picker, moving the wizard on once the list is saved.
export function CompetitorsStep(props: Omit<CompetitorPickerProps, "onSaved" | "saveLabel">) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-6">
      <CompetitorPicker {...props} saveLabel="Continue" onSaved={() => router.push("/onboarding/questions")} />
      <Button asChild variant="ghost" className="hidden w-fit lg:inline-flex">
        <Link href="/onboarding/details">
          <ArrowLeft aria-hidden />
          Back
        </Link>
      </Button>
    </div>
  );
}
