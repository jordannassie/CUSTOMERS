import Link from "next/link";
import { ChevronRight, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WebsiteView } from "@/modules/competitors";

/**
 * "Competitor websites" (B-91, B-93): where each competitor's website check stands. The check itself is only on each
 * competitor's comparison page (Websites tab), so a site can never be read from two places (D-85).
 */
export function CompetitorWebsites({ competitors }: { competitors: { competitorId: string; name: string; website: WebsiteView }[] }) {
  if (competitors.length === 0) return null;
  return (
    <Card data-testid="competitor-websites">
      <CardHeader>
        <CardTitle className="text-base">Competitor websites</CardTitle>
        <CardDescription>What their websites show that yours doesn&apos;t. Each website is read once and kept.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {competitors.map((c) => {
            const status = c.website.checked ? "Checked" : c.website.checking ? "Being checked now" : "Not checked yet";
            return (
              <li key={c.competitorId}>
                <Link
                  href={`/competitors/${c.competitorId}?tab=websites`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/70"
                  data-testid="website-row"
                >
                  <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{c.website.domain ?? "Website not known yet"}</span>
                  </span>
                  <span className={c.website.checked ? "text-xs font-medium text-good-text" : "text-xs text-muted-foreground"}>{status}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
