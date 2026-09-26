import { Loader2 } from "lucide-react";

export default function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-1 items-center justify-center gap-2 bg-bg-base text-[13px] text-text-secondary"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
