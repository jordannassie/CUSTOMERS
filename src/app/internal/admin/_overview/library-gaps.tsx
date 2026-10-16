import { LIBRARY_GAPS_SHOWN, type LibraryGap } from "@/modules/admin";
import Section, { Empty } from "../businesses/[id]/_components/section";

const plural = (n: number) => `${n} ${n === 1 ? "business" : "businesses"}`;

function GapRow({ gap }: { gap: LibraryGap }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0 truncate font-medium" title={gap.label}>
        {gap.label}
        {!gap.listed && <span className="ml-2 font-normal text-text-hint">{gap.vague ? "Other, too vague" : "Other"}</span>}
      </span>
      <span className="shrink-0 text-muted-foreground">{plural(gap.businesses)}</span>
    </li>
  );
}

const listClass = "divide-y divide-border rounded-md border border-border bg-surface text-[13px]";

// MVP_SPEC 5.3: industries with no question library get questions Claude writes; these are candidates for one.
// "Other" labels are counted however they were typed, so the most used can become real industries (2026-10-16).
export default function LibraryGaps({ rows }: { rows: LibraryGap[] }) {
  const shown = rows.slice(0, LIBRARY_GAPS_SHOWN);
  const rest = rows.slice(LIBRARY_GAPS_SHOWN);
  return (
    <Section title="Industries with no question library">
      {rows.length === 0 ? (
        <Empty>Every business&apos;s industry has a question library.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">
            Claude writes these businesses&apos; questions directly. Labels typed under Other are counted however they were spelled. The ones at the top are
            the best candidates for a new library or industry.
          </p>
          <ul className={listClass} data-testid="library-gaps">
            {shown.map((g) => (
              <GapRow key={g.label} gap={g} />
            ))}
          </ul>
          {rest.length > 0 && (
            <details className="text-[13px]">
              <summary className="cursor-pointer py-1 text-primary">Show {rest.length} more</summary>
              <ul className={`mt-2 ${listClass}`} data-testid="library-gaps-more">
                {rest.map((g) => (
                  <GapRow key={g.label} gap={g} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Section>
  );
}
