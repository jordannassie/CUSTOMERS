import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { GoogleAttribution, PlaceRating } from "@/components/onboarding/PlaceBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { headToHead, hoursText, reviewsText, websiteLabel, type SignalRow } from "@/modules/competitors";

const STATUS_NOTE = {
  missing: "Not matched to a Google listing",
  error: "Google details did not load. Refresh to try again.",
} as const;

/** Google Places values side by side (MVP_SPEC 7.1). Shown live, never stored (D-73). */
export function SignalsTable({ rows }: { rows: SignalRow[] }) {
  const you = rows.find((r) => r.isYou)!;
  const competitors = rows.filter((r) => !r.isYou);
  // The competitor with the most reviews makes the clearest comparison.
  const leader = competitors
    .filter((r) => r.signals?.reviewCount)
    .sort((a, b) => b.signals!.reviewCount! - a.signals!.reviewCount!)[0];
  const highlight = leader ? headToHead(leader, you) : null;

  return (
    // The table needs about 720px; below that its own box, not the screen, switches to the stacked list.
    <div className="@container flex flex-col gap-4">
      {highlight ? (
        <p className="text-sm font-medium" data-testid="signals-highlight">
          {highlight}
        </p>
      ) : null}

      <div className="hidden @min-[760px]:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Google rating</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.isYou}-${row.name}`} className={cn(row.isYou && "bg-primary-tint hover:bg-primary-tint")}>
                <TableCell className={cn("max-w-56 truncate font-medium", row.isYou && "text-primary")}>
                  {row.isYou ? `${row.name} (you)` : row.name}
                </TableCell>
                {row.signals ? (
                  <>
                    <TableCell>
                      <PlaceRating rating={row.signals.rating} reviewCount={row.signals.reviewCount} />
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{row.signals.categories.join(", ") || <Hint>Not listed</Hint>}</TableCell>
                    <TableCell>
                      <Website url={row.signals.website} />
                    </TableCell>
                    <TableCell title={row.signals.hours?.join("\n")}>{hoursText(row.signals.hours) ?? <Hint>Not listed</Hint>}</TableCell>
                  </>
                ) : (
                  <TableCell colSpan={4}>
                    <Hint>{STATUS_NOTE[row.status as keyof typeof STATUS_NOTE]}</Hint>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y divide-border @min-[760px]:hidden">
        {rows.map((row) => (
          <li key={`${row.isYou}-${row.name}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <span className={cn("truncate text-sm font-medium", row.isYou && "text-primary")}>
              {row.isYou ? `${row.name} (you)` : row.name}
            </span>
            {row.signals ? (
              <>
                <span className="text-[13px] tabular-nums">{reviewsText(row.signals)}</span>
                <span className="text-[13px] text-muted-foreground">
                  {[row.signals.categories[0], hoursText(row.signals.hours)].filter(Boolean).join(". ")}
                </span>
                <Website url={row.signals.website} />
              </>
            ) : (
              <Hint>{STATUS_NOTE[row.status as keyof typeof STATUS_NOTE]}</Hint>
            )}
          </li>
        ))}
      </ul>

      <GoogleAttribution what="Ratings, categories, websites and hours" />
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] text-text-hint">{children}</span>;
}

function Website({ url }: { url: string | null }) {
  if (!url || !/^https?:\/\//i.test(url)) return <Hint>No website listed</Hint>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex max-w-48 items-center gap-1 text-[13px] text-primary hover:underline"
    >
      <span className="truncate">{websiteLabel(url)}</span>
      <ExternalLink aria-hidden className="size-3 shrink-0" />
    </a>
  );
}
