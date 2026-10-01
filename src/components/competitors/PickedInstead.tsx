import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PickedInstead as Picked } from "@/modules/competitors";
import { Leaderboard } from "./Leaderboard";

const COMPETITORS = "/competitors";

/** "Who AI picked instead" on the Overview (DB-004): who is named more than you, without a rank (D-63). */
export function PickedInstead({ picked }: { picked: Picked | "none-tracked" }) {
  return (
    <Card data-testid="picked-instead">
      <CardHeader>
        <CardTitle className="text-base">Who AI picked instead</CardTitle>
        <CardDescription>How often AI named each business in customer questions, last 30 days.</CardDescription>
        {picked !== "none-tracked" && (
          <CardAction>
            <Link href={COMPETITORS} className="text-sm font-medium text-primary hover:underline">
              See all competitors
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {picked === "none-tracked" ? (
          <div className="flex flex-col items-start gap-4">
            <p className="max-w-prose text-sm text-muted-foreground">Add the businesses you compete with to see who AI picks instead of you.</p>
            <Button asChild size="sm">
              <Link href={`${COMPETITORS}/manage`}>Add competitors</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[15px] font-medium" data-testid="picked-sentence">
              {picked.sentence}
            </p>
            {picked.notNamed ? (
              <div>
                <Button asChild size="sm">
                  <Link href="/opportunities">See your first fix</Link>
                </Button>
              </div>
            ) : (
              <Leaderboard view={{ leaderboard: picked.rows, margin: picked.margin }} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
