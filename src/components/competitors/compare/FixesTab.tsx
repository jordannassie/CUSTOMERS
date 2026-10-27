import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fixHref } from "@/lib/fix-where";
import type { WhyPanel } from "@/modules/competitors";

/** "Fixes": your saved fixes that are about this competitor; each opens on Opportunities, already expanded. */
export function FixesTab({ panel }: { panel: WhyPanel }) {
  return (
    <div className="flex flex-col gap-4" data-testid="tab-fixes">
      {panel.fixes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fixes mention them yet. Your fixes come from each scan.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {panel.fixes.map((f) => (
            <li key={f.id}>
              <Link
                href={fixHref(f.id)}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-primary/40 hover:bg-primary-tint"
              >
                <span className="min-w-0">{f.title}</span>
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" className="w-fit">
        <Link href="/opportunities">See all your fixes</Link>
      </Button>
    </div>
  );
}
