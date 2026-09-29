import { LinkIcon } from "lucide-react";

export function InactiveReport() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center" data-testid="report-inactive">
      <LinkIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold tracking-[-0.02em]">This report link is no longer active.</h1>
      <p className="text-sm text-muted-foreground">Ask the person who sent it to you for a new link.</p>
    </div>
  );
}

export default function SharedReportNotFound() {
  return (
    <main className="flex-1 bg-background">
      <InactiveReport />
    </main>
  );
}
