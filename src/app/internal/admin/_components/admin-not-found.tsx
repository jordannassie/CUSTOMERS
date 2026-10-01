import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Not found inside the admin shell, pointing back to the list the admin came from (UI-033). */
export default function AdminNotFound({ title, text, backHref, backLabel }: {
  title: string;
  text: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center">
        <SearchX aria-hidden className="size-6 text-text-hint" />
        <h1 className="text-[15px] font-medium">{title}</h1>
        <p className="max-w-sm text-[14px] text-muted-foreground">{text}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
