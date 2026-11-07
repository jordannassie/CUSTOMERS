import { Card, CardContent } from "@/components/ui/card";

/** An empty state card: what is missing, and the next step in one line. */
export function SourcesEmpty({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex flex-col">
        <h2 className="font-display text-[22px] leading-snug font-semibold">{title}</h2>
        <div className="mt-3 flex max-w-[560px] flex-col text-[15px] leading-relaxed text-ink-2">{children}</div>
      </CardContent>
    </Card>
  );
}
