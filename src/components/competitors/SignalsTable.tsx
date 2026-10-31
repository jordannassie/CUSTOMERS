import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { GoogleAttribution, PlaceRating } from "@/components/onboarding/PlaceBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { headToHead, hoursText, matchedNone, reviewsText, websiteAction, websiteLabel, websiteShown, type SignalRow } from "@/modules/competitors";
import { CompetitorWebsite, type SaveWebsiteAction } from "./CompetitorWebsite";

// Google could not be reached or its daily limit was used up: one quiet note above the table, and a short word in
// each row it affects, instead of the same long sentence in every row (2026-10-14).
const STATUS_NOTE = {
  missing: "Not matched to a Google listing",
  error: "Couldn't load Google details",
  limited: "Couldn't load Google details",
} as const;
const NOT_REFRESHED = "Google details could not be refreshed. Try again later.";
// A chain's site matches branches in several cities, so no listing was picked for it: the owner picks theirs (step 6d).
const PICK_BRANCH = "/actions#pick-branch";

/** Google Places values side by side (MVP_SPEC 7.1). Shown live, never stored (D-73). */
/** "Add website" needs both; the PDF report passes neither and shows the saved websites only. */
type WebsiteEdit = { businessId: string; save: SaveWebsiteAction };

export function SignalsTable({ rows, pickBranch = false, edit = null }: { rows: SignalRow[]; pickBranch?: boolean; edit?: WebsiteEdit | null }) {
  if (matchedNone(rows) && !pickBranch) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="signals-none">
        None of these businesses matched a Google listing yet.
      </p>
    );
  }
  const you = rows.find((r) => r.isYou)!;
  const competitors = rows.filter((r) => !r.isYou);
  // The competitor with the most reviews makes the clearest comparison.
  const leader = competitors
    .filter((r) => r.signals?.reviewCount)
    .sort((a, b) => b.signals!.reviewCount! - a.signals!.reviewCount!)[0];
  const highlight = leader ? headToHead(leader, you) : null;

  const unrefreshed = rows.some((r) => r.status === "error" || r.status === "limited");
  return (
    // The table needs about 720px; below that its own box, not the screen, switches to the stacked list.
    <div className="@container flex flex-col gap-4">
      {unrefreshed ? (
        <p className="text-[13px] text-muted-foreground" data-testid="signals-not-refreshed">
          {NOT_REFRESHED}
        </p>
      ) : null}
      {highlight ? (
        <p className="text-sm font-medium" data-testid="signals-highlight">
          {highlight}
        </p>
      ) : null}

      {/* The PDF page is about 720px wide, just under the switch, and the table still fits there, so print forces it. */}
      <div className="hidden overflow-hidden rounded-md border border-border @min-[760px]:block print:block">
        <Table className="text-[13px]">
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
              <TableRow key={`${row.isYou}-${row.name}`} className={cn(row.isYou && "bg-primary-tint/40 hover:bg-primary-tint/40")}>
                <TableCell className={cn("max-w-64 min-w-40 font-medium break-words whitespace-normal", row.isYou && "text-primary")}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    {/* Only a website the user typed gives the icon: nothing from Google is used beyond showing it (D-73). */}
                    <SiteIcon domain={row.savedSite ?? null} name={row.name} size="sm" />
                    <span className="min-w-0">{row.isYou ? `${row.name} (you)` : row.name}</span>
                  </span>
                </TableCell>
                {row.signals ? (
                  <>
                    <TableCell>
                      <PlaceRating rating={row.signals.rating} reviewCount={row.signals.reviewCount} />
                    </TableCell>
                    <TableCell className="max-w-48 truncate" title={row.signals.categories.join(", ") || undefined}>
                      {row.signals.categories.join(", ") || <Hint>Not listed</Hint>}
                    </TableCell>
                    <TableCell>
                      <WebsiteCell row={row} edit={edit} />
                    </TableCell>
                    <TableCell title={row.signals.hours?.join("\n")}>{hoursText(row.signals.hours) ?? <Hint>Not listed</Hint>}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell colSpan={2}>
                      <NoSignals row={row} pickBranch={pickBranch} />
                    </TableCell>
                    <TableCell>
                      <WebsiteCell row={row} edit={edit} />
                    </TableCell>
                    <TableCell />
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y divide-border @min-[760px]:hidden print:hidden">
        {rows.map((row) => (
          <li key={`${row.isYou}-${row.name}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <span className={cn("text-sm font-medium break-words", row.isYou && "text-primary")}>
              {row.isYou ? `${row.name} (you)` : row.name}
            </span>
            {row.signals ? (
              <>
                <span className="text-[13px] tabular-nums">{reviewsText(row.signals)}</span>
                <span className="text-[13px] text-muted-foreground">
                  {[row.signals.categories[0], hoursText(row.signals.hours)].filter(Boolean).join(". ")}
                </span>
                <WebsiteCell row={row} edit={edit} />
              </>
            ) : (
              <>
                <NoSignals row={row} pickBranch={pickBranch} />
                <WebsiteCell row={row} edit={edit} />
              </>
            )}
          </li>
        ))}
      </ul>

      <GoogleAttribution what="Ratings, categories, websites and hours" />
    </div>
  );
}

function NoSignals({ row, pickBranch }: { row: SignalRow; pickBranch: boolean }) {
  if (row.isYou && row.status === "missing" && pickBranch) {
    return (
      <Link href={PICK_BRANCH} className="text-[13px] font-medium text-primary hover:underline" data-testid="signals-pick-branch">
        Pick your branch on Google
      </Link>
    );
  }
  return <Hint>{STATUS_NOTE[row.status as keyof typeof STATUS_NOTE]}</Hint>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] text-text-hint">{children}</span>;
}

/**
 * Google's website when it lists one. Otherwise a website the user typed, marked "added by you", or "No website on
 * Google" with "Add website". When Google could not be reached or found no listing, the cell is empty: the row's own
 * note says why, and nothing here says the business has no website or asks for one (2026-10-15).
 */
function WebsiteCell({ row, edit }: { row: SignalRow; edit: WebsiteEdit | null }) {
  const shown = websiteShown(row);
  if (shown.kind === "google") return <WebsiteLink url={shown.url} />;
  const action =
    edit && row.competitorId && websiteAction(shown) ? (
      <CompetitorWebsite businessId={edit.businessId} competitorId={row.competitorId} name={row.name} current={row.savedSite ?? null} save={edit.save} />
    ) : null;
  if (shown.kind === "saved") {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="saved-website">
        <WebsiteLink url={`https://${shown.domain}`} />
        <span className="text-[12px] text-text-hint">added by you</span>
        {action}
      </span>
    );
  }
  if (shown.kind === "unknown") return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="no-google-website">
      <Hint>No website on Google</Hint>
      {action}
    </span>
  );
}

function WebsiteLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex max-w-48 items-center gap-1 text-[13px] text-primary hover:underline"
    >
      <span className="truncate" title={websiteLabel(url)}>
        {websiteLabel(url)}
      </span>
      <ExternalLink aria-hidden className="size-3 shrink-0" />
    </a>
  );
}
