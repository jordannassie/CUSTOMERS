import { LIBRARY_GAPS_SHOWN, type LibraryGap } from "@/modules/admin";
import Section, { Empty } from "../businesses/[id]/_components/section";

const plural = (n: number) => `${n} ${n === 1 ? "business" : "businesses"}`;

// MVP_SPEC 5.3: industries with no question library get questions Claude writes; these are candidates for one.
export default function LibraryGaps({ rows }: { rows: LibraryGap[] }) {
  const shown = rows.slice(0, LIBRARY_GAPS_SHOWN);
  return (
    <Section title="Industries with no question library">
      {rows.length === 0 ? (
        <Empty>Every business&apos;s industry has a question library.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">
            Claude writes these businesses&apos; questions directly. The ones at the top are the best candidates for a new library.
          </p>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[13px]" data-testid="library-gaps">
            {shown.map((g) => (
              <li key={g.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate font-medium">
                  {g.label}
                  {!g.listed && <span className="ml-2 font-normal text-text-hint">Other</span>}
                </span>
                <span className="shrink-0 text-muted-foreground">{plural(g.businesses)}</span>
              </li>
            ))}
          </ul>
          {rows.length > shown.length && <p className="text-[13px] text-text-hint">And {rows.length - shown.length} more.</p>}
        </div>
      )}
    </Section>
  );
}
