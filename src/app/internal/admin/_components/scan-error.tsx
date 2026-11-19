import { cn } from "cn";
import { explainScanError } from "@/modules/admin";

/**
 * A scan's stored error in plain words, with what each AI tool said folded away under "What the AI tools said". No
 * status codes or JSON (owner, 2026-11-16). `clamp` keeps the sentence to a few lines in tight spots (the Overview list, the Scans table).
 */
export default function ScanError({ error, clamp = false, className }: { error: string | null | undefined; clamp?: boolean; className?: string }) {
  const text = explainScanError(error);
  if (!text) return null;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 whitespace-normal", className)}>
      <p className={cn("text-foreground", clamp && "line-clamp-3")} title={clamp ? text.summary : undefined}>
        {text.summary}
      </p>
      {text.details && (
        <details className="text-[length:calc(12px*var(--px,1))]">
          <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">What the AI tools said</summary>
          <p className="mt-1 max-h-40 overflow-y-auto rounded-sm bg-muted px-2 py-1.5 break-words whitespace-pre-wrap text-muted-foreground">
            {text.details}
          </p>
        </details>
      )}
    </div>
  );
}
