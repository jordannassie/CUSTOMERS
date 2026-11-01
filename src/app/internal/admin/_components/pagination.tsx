import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The page's address with another page number, keeping the filter and search. */
export function pageHref(base: string, params: Record<string, string | undefined>, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set("page", String(page));
  else query.delete("page");
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

/** "51 to 100 of 230" with Previous and Next, for the server-paged admin lists (50 a page). */
export default function Pagination({
  base,
  params,
  page,
  pages,
  total,
  pageSize,
  noun,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  noun: string;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
      <p className="tabular-nums">
        {first.toLocaleString("en-US")} to {last.toLocaleString("en-US")} of {total.toLocaleString("en-US")} {noun}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <PageLink href={page > 1 ? pageHref(base, params, page - 1) : null} label="Previous page">
            <ChevronLeft aria-hidden />
          </PageLink>
          <span className="tabular-nums">
            Page {page} of {pages}
          </span>
          <PageLink href={page < pages ? pageHref(base, params, page + 1) : null} label="Next page">
            <ChevronRight aria-hidden />
          </PageLink>
        </div>
      )}
    </nav>
  );
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button variant="outline" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="icon-sm">
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
