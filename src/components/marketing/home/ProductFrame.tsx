import { ExampleTag } from "./example";

export const EXAMPLE_BUSINESS = "Bean House, Orange, CA";

/** A screen from the app, drawn with the app's own components and made-up data (MVP_SPEC 12.2). */
export function ProductFrame({ page, note, children }: { page: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted p-3 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-4 px-1 sm:mb-5 sm:px-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-lg font-semibold tracking-[-0.02em]">{page}</p>
          <p className="text-[13px] text-muted-foreground">
            {EXAMPLE_BUSINESS}
            {note && `. ${note}`}
          </p>
        </div>
        <ExampleTag />
      </div>
      {children}
    </div>
  );
}
