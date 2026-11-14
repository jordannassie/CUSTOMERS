import { cn } from "cn";
import type { SubKind } from "@/modules/sources/classify";
import { MENTIONS_LABELS, type MentionsYou } from "@/modules/sources/service";
import { PILL_BOX, PILL_CLASS } from "@/components/app/pills";

/** The kind of website ("Directory", "Food guide") as a grey pill (pills.ts); the wider type shows on hover. */
export function KindChip({ kind, label, title }: { kind: SubKind; label: string; title?: string }) {
  return (
    <span
      className={cn(
        PILL_BOX,
        PILL_CLASS.plain,
        kind === "own" && "font-semibold text-foreground",
      )}
      title={title}
      data-testid="site-kind"
    >
      {label}
    </span>
  );
}

/** Whether answers that used the site named the business: No, Sometimes, Always, or whose site it is. Blue for No. */
export function MentionsChip({ mentions }: { mentions: MentionsYou }) {
  return (
    <span
      className={cn(PILL_BOX, mentions === "no" ? PILL_CLASS.attention : PILL_CLASS.plain)}
      data-testid="site-mentions"
    >
      {MENTIONS_LABELS[mentions]}
    </span>
  );
}
