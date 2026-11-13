import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The red message under a payment form; the same one the onboarding steps use. */
export { StepError as FormError } from "@/components/onboarding/StepBits";

/** The pay button of the Choose plan and Buy credits forms. */
export function PayButton({ label, pending, disabled = false }: { label: string; pending: boolean; disabled?: boolean }) {
  return (
    <Button type="submit" disabled={pending || disabled} className="self-start">
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {label}
    </Button>
  );
}
