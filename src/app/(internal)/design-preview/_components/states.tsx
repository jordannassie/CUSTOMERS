import { CircleAlert, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Demo } from "./section";

export function States() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Demo label="Loading">
        <Card aria-busy="true" aria-label="Loading visibility score">
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-4">
              <Skeleton className="size-[92px] rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Demo>

      <Demo label="Empty">
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <MessageSquareText className="size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">No checks yet</p>
              <p className="mt-1 text-muted-foreground">
                Run your first check to see if ChatGPT, Claude and Perplexity mention your business.
              </p>
            </div>
            <Button size="sm">Run first check</Button>
          </CardContent>
        </Card>
      </Demo>

      <Demo label="Error">
        <Card className="border-low/40">
          <CardContent className="flex flex-col items-start gap-3">
            <CircleAlert className="size-5 text-low" />
            <div>
              <p className="font-medium text-low-text">Results did not load</p>
              <p className="mt-1 text-muted-foreground">
                The connection dropped before your results arrived. Your credits were not used.
              </p>
            </div>
            <Button size="sm" variant="outline">
              Try again
            </Button>
          </CardContent>
        </Card>
      </Demo>
    </div>
  );
}
