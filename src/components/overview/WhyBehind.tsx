import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FactList } from "@/components/standing/FactList";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhyCard } from "@/modules/competitors";

/** The Overview's short answer to "why are they ahead?", from saved answers only, with a link to the full panel. */
export function WhyBehind({ why }: { why: WhyCard }) {
  const href = `/competitors?why=${encodeURIComponent(why.competitorId)}`;
  const behind = why.side === "behind";
  return (
    <Card data-testid="why-behind">
      <CardHeader>
        <CardTitle className="text-base">{behind ? `Why ${why.name} is ahead of you` : `Why you're ahead of ${why.name}`}</CardTitle>
        <CardAction>
          <Link href={href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            See why
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {why.question && <p className="text-[13px] text-muted-foreground">{why.question}</p>}
        {why.facts.length > 0 ? (
          <FactList facts={why.facts} tone={behind ? "behind" : "ahead"} className="grid md:grid-cols-2" openFixes={why.openFixes} />
        ) : (
          !why.question && <p className="text-sm text-muted-foreground">{"The answers don't point to a clear reason yet."}</p>
        )}
      </CardContent>
    </Card>
  );
}
